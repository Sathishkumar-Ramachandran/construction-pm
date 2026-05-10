import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { writeAuditLog, sanitiseForAudit, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { orderId } = await params;

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: parseInt(orderId), company_id: user.company_id },
    include: {
      project: { select: { id: true, name: true } },
      supplier: true,
      lines: {
        include: {
          inventory_item: { select: { name: true, unit: true, code: true } },
        },
      },
      created_by: { select: { full_name: true, role: true } },
    },
  });
  if (!order) return err("Order not found", 404);

  const now = new Date();
  return ok({
    ...order,
    is_overdue:
      ["ORDERED", "PARTIAL"].includes(order.status) &&
      new Date(order.expected_delivery) < now,
    days_overdue:
      ["ORDERED", "PARTIAL"].includes(order.status) &&
      new Date(order.expected_delivery) < now
        ? Math.floor(
            (now.getTime() - new Date(order.expected_delivery).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);
  const { orderId } = await params;

  const before = await prisma.purchaseOrder.findFirst({
    where: { id: parseInt(orderId), company_id: user.company_id },
  });
  if (!before) return err("Order not found", 404);
  if (["DELIVERED", "CANCELLED"].includes(before.status))
    return err("Cannot edit a delivered or cancelled order");

  const body = await request.json();
  const { expected_delivery, notes, supplier_contact, status } = body;

  const updated = await prisma.purchaseOrder.update({
    where: { id: parseInt(orderId) },
    data: {
      expected_delivery: expected_delivery ? new Date(expected_delivery) : undefined,
      notes,
      supplier_contact,
      status: status ?? undefined,
    },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: status && status !== before.status ? "STATUS_CHANGE" : "UPDATE",
    entityType: "PurchaseOrder",
    entityId: updated.id,
    entityLabel: `PO ${updated.po_number}`,
    projectId: updated.project_id ?? undefined,
    previousData: sanitiseForAudit(before as unknown as Record<string, unknown>),
    newData: sanitiseForAudit(updated as unknown as Record<string, unknown>),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
