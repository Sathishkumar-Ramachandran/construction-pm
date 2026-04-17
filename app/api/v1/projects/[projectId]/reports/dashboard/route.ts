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

  const [project, phases, permits, docs, materials, defects, totalTasks, completedTasks, lastReport, nextInsp] = await Promise.all([
    prisma.project.findFirst({ where: { id: pid } }),
    prisma.projectPhase.findMany({ where: { project_id: pid }, orderBy: { phase_no: "asc" } }),
    prisma.permit.findMany({ where: { project_id: pid } }),
    prisma.document.findMany({ where: { project_id: pid } }),
    prisma.materialSubmittal.findMany({ where: { project_id: pid } }),
    prisma.defect.findMany({ where: { project_id: pid } }),
    prisma.phaseTask.count({ where: { phase: { project_id: pid } } }),
    prisma.phaseTask.count({ where: { phase: { project_id: pid }, status: { in: ["completed", "not_applicable"] } } }),
    prisma.dailyReport.findFirst({ where: { project_id: pid }, orderBy: { report_date: "desc" } }),
    prisma.inspection.findFirst({ where: { project_id: pid, status: "scheduled" }, orderBy: { scheduled_date: "asc" } }),
  ]);

  if (!project) return err("Project not found", 404);

  const overall_pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return ok({
    project: {
      id: project.id,
      name: project.name,
      project_no: project.project_no,
      hdb_block: project.hdb_block,
      hdb_street: project.hdb_street,
      hdb_town: project.hdb_town,
      status: project.status,
      current_phase: project.current_phase,
      overall_completion_pct: overall_pct,
      planned_start_date: project.planned_start_date,
      planned_end_date: project.planned_end_date,
    },
    phases: phases.map((p) => ({
      phase_no: p.phase_no,
      phase_name: p.phase_name,
      status: p.status,
      completion_pct: p.completion_pct,
    })),
    permits: {
      total: permits.length,
      approved: permits.filter((p) => p.status === "approved").length,
      pending: permits.filter((p) => ["submitted", "under_review", "draft"].includes(p.status)).length,
      rejected: permits.filter((p) => p.status === "rejected").length,
      not_required: permits.filter((p) => p.status === "not_required").length,
    },
    documents: {
      total: docs.length,
      approved: docs.filter((d) => d.status === "approved").length,
      pending: docs.filter((d) => ["submitted", "under_review", "draft"].includes(d.status)).length,
      rejected: docs.filter((d) => d.status === "rejected").length,
    },
    materials: {
      total: materials.length,
      approved: materials.filter((m) => m.status === "approved").length,
      pending: materials.filter((m) => ["submitted", "draft"].includes(m.status)).length,
      rejected: materials.filter((m) => m.status === "rejected").length,
    },
    defects: {
      total: defects.length,
      open: defects.filter((d) => d.status === "open").length,
      in_progress: defects.filter((d) => d.status === "in_progress").length,
      rectified: defects.filter((d) => ["rectified", "verified_ok", "closed"].includes(d.status)).length,
      high: defects.filter((d) => d.severity === "high" && ["open", "in_progress"].includes(d.status)).length,
    },
    last_daily_report: lastReport
      ? { date: lastReport.report_date, weather: lastReport.weather, workers_present: lastReport.workers_present }
      : null,
    next_inspection: nextInsp
      ? { date: nextInsp.scheduled_date, type: nextInsp.inspection_type, title: nextInsp.title }
      : null,
  });
}
