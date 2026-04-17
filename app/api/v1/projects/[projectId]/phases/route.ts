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

    const phases = await prisma.projectPhase.findMany({
      where: { project_id: pid },
      orderBy: { phase_no: "asc" },
    });

    return ok(phases);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
