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
  const { qty_used, date, area_covered, batch_number, notes, phase_id } = body;
  if (!qty_used || qty_used <= 0) return err("qty_used must be positive");

  const pi = await prisma.projectInventory.findFirst({
    where: { id: parseInt(piId), project_id: pid },
    include: { inventory_item: true },
  });
  if (!pi) return err("Project inventory record not found", 404);

  const remaining = Number(pi.qty_allocated) - Number(pi.qty_used);
  if (qty_used > remaining) return err(`Only ${remaining} units remaining`);

  const [updated] = await prisma.$transaction([
    prisma.projectInventory.update({
      where: { id: pi.id },
      data: { qty_used: { increment: qty_used } },
    }),
    prisma.inventoryUsageRecord.create({
      data: {
        project_inventory_id: pi.id,
        project_id: pid,
        phase_id: phase_id ?? pi.phase_id,
        date: date ? new Date(date) : new Date(),
        qty_used,
        area_covered: area_covered ?? null,
        batch_number,
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
    entityType: "InventoryUsageRecord",
    entityId: pi.id,
    entityLabel: `Used ${qty_used} ${pi.inventory_item.unit} of ${pi.inventory_item.name}`,
    projectId: pid,
    newData: { qty_used, project_inventory_id: pi.id },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
