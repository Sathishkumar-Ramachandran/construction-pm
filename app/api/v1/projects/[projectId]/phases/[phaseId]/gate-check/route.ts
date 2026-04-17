import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { prisma } from "@/lib/db";
import { checkPhaseGate } from "@/lib/server/project-service";

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
    });
    if (!phase) return err("Phase not found", 404);

    const result = await checkPhaseGate(pid, phase.phase_no);
    return ok(result);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
