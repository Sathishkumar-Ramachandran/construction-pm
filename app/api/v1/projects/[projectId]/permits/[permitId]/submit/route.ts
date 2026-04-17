import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function POST(
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

    if (!["super_admin", "company_admin", "project_manager", "safety_officer"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const permit = await prisma.permit.findFirst({ where: { id: parseInt(permitId), project_id: pid } });
    if (!permit) return err("Permit not found", 404);

    await prisma.permit.update({
      where: { id: parseInt(permitId) },
      data: { status: "submitted", submitted_by: user.id },
    });

    return ok(null, "Permit submitted for approval");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
