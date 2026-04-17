import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, reportId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const report = await prisma.dailyReport.findFirst({
    where: { id: parseInt(reportId), project_id: pid },
  });
  if (!report) return err("Report not found", 404);
  return ok(report);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, reportId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const report = await prisma.dailyReport.findFirst({
    where: { id: parseInt(reportId), project_id: pid },
  });
  if (!report) return err("Report not found", 404);
  if (report.status === "submitted") return err("Cannot edit a submitted report", 400);

  const body = await request.json();
  const updated = await prisma.dailyReport.update({
    where: { id: parseInt(reportId) },
    data: {
      ...(body.weather !== undefined ? { weather: body.weather } : {}),
      ...(body.temperature_c !== undefined ? { temperature_c: body.temperature_c } : {}),
      ...(body.workers_present !== undefined ? { workers_present: body.workers_present } : {}),
      ...(body.work_done_summary !== undefined ? { work_done_summary: body.work_done_summary } : {}),
      ...(body.areas_worked !== undefined ? { areas_worked: JSON.stringify(body.areas_worked) } : {}),
      ...(body.materials_used !== undefined ? { materials_used: JSON.stringify(body.materials_used) } : {}),
      ...(body.has_issues !== undefined ? { has_issues: body.has_issues } : {}),
      ...(body.issues_description !== undefined ? { issues_description: body.issues_description } : {}),
      ...(body.delay_reason !== undefined ? { delay_reason: body.delay_reason } : {}),
      ...(body.next_day_plan !== undefined ? { next_day_plan: body.next_day_plan } : {}),
    },
  });
  return ok(updated);
}
