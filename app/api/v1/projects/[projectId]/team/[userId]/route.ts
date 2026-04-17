import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, userId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const team = await prisma.projectTeam.findFirst({
      where: { project_id: pid, user_id: parseInt(userId) },
    });
    if (team) {
      await prisma.projectTeam.update({ where: { id: team.id }, data: { is_active: false } });
    }

    return ok(null, "Team member removed");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
