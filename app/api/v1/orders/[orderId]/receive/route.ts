import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);
  const { orderId } = await params;

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: parseInt(orderId), company_id: user.company_id },
    include: { lines: { include: { inventory_item: true } } },
  });
  if (!order) return err("Order not found", 404);
  if (order.status === "CANCELLED") return err("Order is cancelled");
  if (order.status === "DELIVERED") return err("Order already fully delivered");

  const body = await request.json();
  const { received_date, lines, notes } = body;
  if (!lines || lines.length === 0) return err("lines are required");

  type LineInput = { line_id: number; qty_received: number };

  const ops = [];
  for (const l of lines as LineInput[]) {
    const existing = order.lines.find((ol) => ol.id === l.line_id);
    if (!existing) continue;
    const newQtyReceived = Number(existing.qty_received) + l.qty_received;

    ops.push(
      prisma.purchaseOrderLine.update({
        where: { id: l.line_id },
        data: { qty_received: newQtyReceived },
      }),
      prisma.inventoryItem.update({
        where: { id: existing.inventory_item_id },
        data: { qty_on_hand: { increment: l.qty_received } },
      }),
      prisma.inventoryTransaction.create({
        data: {
          company_id: user.company_id,
          inventory_item_id: existing.inventory_item_id,
          type: "PURCHASE_RECEIPT",
          qty: l.qty_received,
          qty_before: Number(existing.inventory_item.qty_on_hand),
          qty_after: Number(existing.inventory_item.qty_on_hand) + l.qty_received,
          project_id: order.project_id,
          order_id: order.id,
          notes,
          recorded_by_id: user.id,
        },
      })
    );
  }

  // Determine new status
  const updatedLines = order.lines.map((ol) => {
    const recv = (lines as LineInput[]).find((l) => l.line_id === ol.id);
    const newQty = Number(ol.qty_received) + (recv?.qty_received ?? 0);
    return { ...ol, qty_received: newQty };
  });
  const allDelivered = updatedLines.every(
    (l) => Number(l.qty_received) >= Number(l.qty_ordered)
  );
  const newStatus = allDelivered ? "DELIVERED" : "PARTIAL";

  ops.push(
    prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        actual_delivery: allDelivered
          ? received_date
            ? new Date(received_date)
            : new Date()
          : undefined,
      },
    })
  );

  await prisma.$transaction(ops);

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "RECEIVE",
    entityType: "PurchaseOrder",
    entityId: order.id,
    entityLabel: `GRN for PO ${order.po_number} — status: ${newStatus}`,
    projectId: order.project_id ?? undefined,
    newData: { received_date, lines, new_status: newStatus, notes },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok({ status: newStatus, message: `Order marked as ${newStatus.toLowerCase()}` });
}
