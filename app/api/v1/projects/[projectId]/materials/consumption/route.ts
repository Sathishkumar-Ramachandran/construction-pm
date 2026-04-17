import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, created, err } from "@/lib/server/helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const records = await prisma.materialConsumption.findMany({
      where: { project_id: pid },
      orderBy: { date_used: "desc" },
    });

    return ok(records);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager", "supervisor"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const body = await request.json();
    const { material_id, date_used, qty_used, qty_unit, area_applied, batch_no, notes, phase_id } = body;
    if (!material_id || !date_used || !qty_used || !qty_unit) {
      return err("material_id, date_used, qty_used, and qty_unit are required");
    }

    const record = await prisma.materialConsumption.create({
      data: {
        project_id: pid,
        phase_id: phase_id ? parseInt(phase_id) : null,
        material_id: parseInt(material_id),
        date_used: new Date(date_used),
        qty_used: parseFloat(qty_used),
        qty_unit,
        area_applied: area_applied || null,
        batch_no: batch_no || null,
        recorded_by: user.id,
        notes: notes || null,
      },
    });

    return created(record, "Consumption logged");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
