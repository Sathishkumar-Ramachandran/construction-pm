import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

const SUBMIT_ROLES = ["super_admin", "company_admin", "project_manager", "safety_officer"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; permitId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, permitId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const permit = await prisma.permit.findFirst({
      where: { id: parseInt(permitId), project_id: pid },
    });
    if (!permit) return err("Permit not found", 404);
    return ok(permit);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; permitId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, permitId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);
    if (!SUBMIT_ROLES.includes(user.role)) return err("Insufficient permissions", 403);

    const permit = await prisma.permit.findFirst({ where: { id: parseInt(permitId), project_id: pid } });
    if (!permit) return err("Permit not found", 404);

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const fields = ["permit_type", "title", "reference_no", "issuing_authority", "applied_date", "notes", "status"];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = field.includes("date") && body[field] ? new Date(body[field]) : body[field];
      }
    }

    const updated = await prisma.permit.update({ where: { id: parseInt(permitId) }, data: updateData });
    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
