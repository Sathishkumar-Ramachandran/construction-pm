import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created } from "@/lib/server/helpers";
import { requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const items = await prisma.projectInventory.findMany({
    where: { project_id: pid },
    include: {
      inventory_item: true,
      usage_records: { orderBy: { date: "desc" }, take: 5 },
    },
  });

  return ok(
    items.map((pi) => ({
      ...pi,
      qty_available: Number(pi.qty_allocated) - Number(pi.qty_used) - Number(pi.qty_returned),
    }))
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const body = await request.json();
  const { inventory_item_id, phase_id, qty_allocated, material_submittal_id } = body;
  if (!inventory_item_id || !qty_allocated) return err("inventory_item_id and qty_allocated are required");

  const item = await prisma.inventoryItem.findFirst({
    where: { id: inventory_item_id, company_id: user.company_id },
  });
  if (!item) return err("Inventory item not found");

  const available = Number(item.qty_on_hand) - Number(item.qty_allocated);
  if (available < qty_allocated) return err(`Only ${available} units available`);

  const [pi] = await prisma.$transaction([
    prisma.projectInventory.create({
      data: {
        project_id: pid,
        inventory_item_id,
        phase_id: phase_id ?? null,
        material_submittal_id: material_submittal_id ?? null,
        qty_allocated,
        allocated_by_id: user.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: inventory_item_id },
      data: { qty_allocated: { increment: qty_allocated } },
    }),
    prisma.inventoryTransaction.create({
      data: {
        company_id: user.company_id,
        inventory_item_id,
        type: "PROJECT_ALLOCATION",
        qty: qty_allocated,
        qty_before: Number(item.qty_on_hand),
        qty_after: Number(item.qty_on_hand),
        project_id: pid,
        recorded_by_id: user.id,
      },
    }),
  ]);

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "ALLOCATE",
    entityType: "ProjectInventory",
    entityId: pi.id,
    entityLabel: `Allocated ${qty_allocated} ${item.unit} of ${item.name} to project`,
    projectId: pid,
    newData: { inventory_item_id, qty_allocated, project_id: pid },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return created(pi);
}
