import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { writeAuditLog, sanitiseForAudit, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ itemId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const { itemId } = await params;
  const item = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(itemId), company_id: user.company_id },
    include: {
      transactions: {
        orderBy: { created_at: "desc" },
        take: 20,
        include: { recorded_by: { select: { full_name: true } } },
      },
    },
  });

  if (!item) return err("Item not found", 404);

  const qtyAvailable = Number(item.qty_on_hand) - Number(item.qty_allocated);
  return ok({ ...item, qty_available: qtyAvailable, is_low_stock: qtyAvailable <= Number(item.reorder_level) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const { itemId } = await params;
  const before = await prisma.inventoryItem.findFirst({
    where: { id: parseInt(itemId), company_id: user.company_id },
  });
  if (!before) return err("Item not found", 404);

  const body = await request.json();
  const { name, brand, category, unit, unit_cost, reorder_level, location, description, is_active } =
    body;

  const updated = await prisma.inventoryItem.update({
    where: { id: parseInt(itemId) },
    data: { name, brand, category, unit, unit_cost, reorder_level, location, description, is_active },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "UPDATE",
    entityType: "InventoryItem",
    entityId: updated.id,
    entityLabel: `${updated.code} — ${updated.name}`,
    previousData: sanitiseForAudit(before as unknown as Record<string, unknown>),
    newData: sanitiseForAudit(updated as unknown as Record<string, unknown>),
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
