import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, phaseId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const phase = await prisma.projectPhase.findFirst({
      where: { id: parseInt(phaseId), project_id: pid },
      include: { tasks: { orderBy: { sort_order: "asc" } } },
    });
    if (!phase) return err("Phase not found", 404);

    return ok(phase);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, phaseId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const phase = await prisma.projectPhase.findFirst({
      where: { id: parseInt(phaseId), project_id: pid },
    });
    if (!phase) return err("Phase not found", 404);

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const fields = ["status", "notes", "planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date"];
    for (const field of fields) {
      if (body[field] !== undefined) {
        if (field.includes("date") && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await prisma.projectPhase.update({ where: { id: parseInt(phaseId) }, data: updateData });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
