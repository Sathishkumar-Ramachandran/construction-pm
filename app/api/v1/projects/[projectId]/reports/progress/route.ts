import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const phases = await prisma.projectPhase.findMany({
    where: { project_id: pid },
    orderBy: { phase_no: "asc" },
    include: { tasks: true },
  });

  const result = phases.map((phase) => ({
    phase_no: phase.phase_no,
    phase_name: phase.phase_name,
    status: phase.status,
    completion_pct: phase.completion_pct,
    planned_start: phase.planned_start_date,
    planned_end: phase.planned_end_date,
    actual_start: phase.actual_start_date,
    actual_end: phase.actual_end_date,
    task_summary: {
      total: phase.tasks.length,
      pending: phase.tasks.filter((t) => t.status === "pending").length,
      in_progress: phase.tasks.filter((t) => t.status === "in_progress").length,
      completed: phase.tasks.filter((t) => t.status === "completed").length,
      not_applicable: phase.tasks.filter((t) => t.status === "not_applicable").length,
    },
  }));
  return ok(result);
}
