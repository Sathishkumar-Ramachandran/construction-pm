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

    const team = await prisma.projectTeam.findMany({
      where: { project_id: pid, is_active: true },
      include: { user: { select: { id: true, full_name: true, email: true, role: true } } },
    });

    const result = team.map((t) => ({
      id: t.id,
      user_id: t.user_id,
      team_role: t.team_role,
      user_name: t.user?.full_name,
      user_email: t.user?.email,
      assigned_at: t.assigned_at,
    }));

    return ok(result);
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

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const { user_id, team_role } = await request.json();
    if (!user_id || !team_role) return err("user_id and team_role are required");

    const existing = await prisma.projectTeam.findFirst({
      where: { project_id: pid, user_id: parseInt(user_id), team_role },
    });

    if (existing) {
      await prisma.projectTeam.update({ where: { id: existing.id }, data: { is_active: true } });
    } else {
      await prisma.projectTeam.create({
        data: { project_id: pid, user_id: parseInt(user_id), team_role, assigned_by: user.id },
      });
    }

    return ok(null, "Team member added");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
