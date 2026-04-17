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

    const tasks = await prisma.phaseTask.findMany({
      where: { phase_id: parseInt(phaseId) },
      orderBy: { sort_order: "asc" },
    });

    return ok(tasks);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
