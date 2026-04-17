import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

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

    const project = await prisma.project.findUnique({
      where: { id: pid },
      include: { phases: { orderBy: { phase_no: "asc" } } },
    });
    if (!project) return err("Project not found", 404);

    return ok(project);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
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

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions to edit project", 403);
    }

    const project = await prisma.project.findUnique({ where: { id: pid } });
    if (!project) return err("Project not found", 404);

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const fields = ["name", "project_type", "hdb_block", "hdb_street", "hdb_town", "postal_code",
      "town_council", "total_floors", "total_blocks", "scope_description", "contract_value",
      "planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date",
      "status", "current_phase", "tc_reference_no", "pm_id", "supervisor_id", "safety_officer_id"];

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (["planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date"].includes(field)) {
          updateData[field] = body[field] ? new Date(body[field]) : null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await prisma.project.update({ where: { id: pid }, data: updateData });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
