import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ itemId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin"].includes(user.role))
    return err("Forbidden — only admins can manually adjust stock", 403);

  const { itemId } = await params;
  const body = await request.json();
  const { qty, type, notes, reference } = body;

  const validTypes = ["MANUAL_ADJUSTMENT", "WRITE_OFF", "OPENING_STOCK", "PURCHASE_RECEIPT"];
  if (qty === undefined || qty === null || qty === 0)
    return err("qty is required and must be non-zero");
  if (!type || !validTypes.includes(type))
    return err(`type must be one of: ${validTypes.join(", ")}`);

  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(itemId), company_id: user.company_id },
  });
  if (!item) return err("Item not found", 404);

  const qtyBefore = Number(item.qty_on_hand);
  const delta = Number(qty); // positive = add, negative = remove
  const qtyAfter = qtyBefore + delta;

  if (qtyAfter < 0) return err("Adjustment would result in negative stock");

  const [updated] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: parseInt(itemId) },
      data: { qty_on_hand: qtyAfter },
    }),
    prisma.inventoryTransaction.create({
      data: {
        company_id: user.company_id,
        inventory_item_id: parseInt(itemId),
        type,
        qty: Math.abs(Number(qty)),
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        reference,
        notes,
        recorded_by_id: user.id,
      },
    }),
  ]);

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "UPDATE",
    entityType: "InventoryItem",
    entityId: parseInt(itemId),
    entityLabel: `${item.code} — ${item.name} (stock adjustment)`,
    previousData: { qty_on_hand: qtyBefore },
    newData: { qty_on_hand: qtyAfter },
    changedFields: ["qty_on_hand"],
    changeReason: notes,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
