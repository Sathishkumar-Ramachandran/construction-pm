import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { calculatePhaseCompletion } from "@/lib/server/project-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; phaseId: string; taskId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, phaseId, taskId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const task = await prisma.phaseTask.findFirst({
      where: { id: parseInt(taskId), phase_id: parseInt(phaseId) },
    });
    if (!task) return err("Task not found", 404);

    return ok(task);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(
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
      return err("You can only update tasks assigned to you", 403);
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const fields = ["status", "notes", "location_zone", "assigned_to_id"];
    for (const field of fields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.status === "in_progress" && !task.started_at) {
      updateData.started_at = new Date();
    }
    if (body.status === "completed") {
      updateData.completed_at = new Date();
      updateData.completed_by = user.id;
    }

    const updated = await prisma.phaseTask.update({ where: { id: tid }, data: updateData });

    const pct = await calculatePhaseCompletion(phid);
    await prisma.projectPhase.update({ where: { id: phid }, data: { completion_pct: pct } });

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
