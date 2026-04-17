import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { calculatePhaseCompletion } from "@/lib/server/project-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; phaseId: string; taskId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, phaseId, taskId } = await params;
    const pid = parseInt(projectId);
    const phid = parseInt(phaseId);
    const tid = parseInt(taskId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const task = await prisma.phaseTask.findFirst({ where: { id: tid, phase_id: phid } });
    if (!task) return err("Task not found", 404);

    if (user.role === "worker" && task.assigned_to_id !== user.id) {
      return err("You can only complete tasks assigned to you", 403);
    }

    await prisma.phaseTask.update({
      where: { id: tid },
      data: { status: "completed", completed_at: new Date(), completed_by: user.id },
    });

    const pct = await calculatePhaseCompletion(phid);
    await prisma.projectPhase.update({ where: { id: phid }, data: { completion_pct: pct } });

    return ok(null, "Task marked as completed");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
