import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ projectId: string; piId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId, piId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const body = await request.json();
  const { qty_returned, notes } = body;
  if (!qty_returned || qty_returned <= 0) return err("qty_returned must be positive");

  const pi = await prisma.projectInventory.findFirst({
    where: { id: parseInt(piId), project_id: pid },
    include: { inventory_item: true },
  });
  if (!pi) return err("Project inventory record not found", 404);

  const returnable =
    Number(pi.qty_allocated) - Number(pi.qty_used) - Number(pi.qty_returned);
  if (qty_returned > returnable) return err(`Only ${returnable} units can be returned`);

  await prisma.$transaction([
    prisma.projectInventory.update({
      where: { id: pi.id },
      data: { qty_returned: { increment: qty_returned } },
    }),
    prisma.inventoryItem.update({
      where: { id: pi.inventory_item_id },
      data: { qty_allocated: { decrement: qty_returned } },
    }),
    prisma.inventoryTransaction.create({
      data: {
        company_id: user.company_id,
        inventory_item_id: pi.inventory_item_id,
        type: "PROJECT_RETURN",
        qty: qty_returned,
        qty_before: Number(pi.inventory_item.qty_on_hand),
        qty_after: Number(pi.inventory_item.qty_on_hand),
        project_id: pid,
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
    entityType: "ProjectInventory",
    entityId: pi.id,
    entityLabel: `Returned ${qty_returned} ${pi.inventory_item.unit} of ${pi.inventory_item.name}`,
    projectId: pid,
    newData: { qty_returned, project_inventory_id: pi.id },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok({ message: "Stock returned successfully" });
}
