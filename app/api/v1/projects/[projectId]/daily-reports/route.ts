import { NextRequest } from "next/server";
import { paginated, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "30")));
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  const where: any = { project_id: pid };
  if (start_date) where.report_date = { ...where.report_date, gte: new Date(start_date) };
  if (end_date) where.report_date = { ...where.report_date, lte: new Date(end_date) };

  const [total, reports] = await Promise.all([
    prisma.dailyReport.count({ where }),
    prisma.dailyReport.findMany({
      where,
      orderBy: { report_date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginated(reports, total, page, limit);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const body = await request.json();
  const reportDate = new Date(body.report_date);

  const existing = await prisma.dailyReport.findFirst({
    where: { project_id: pid, report_date: reportDate },
  });
  if (existing) return err("Daily report for this date already exists", 409);

  const report = await prisma.dailyReport.create({
    data: {
      project_id: pid,
      supervisor_id: user.id,
      report_date: reportDate,
      phase_id: body.phase_id ?? null,
      weather: body.weather,
      temperature_c: body.temperature_c ?? null,
      workers_present: body.workers_present,
      work_done_summary: body.work_done_summary ?? null,
      areas_worked: body.areas_worked ? JSON.stringify(body.areas_worked) : null,
      materials_used: body.materials_used ? JSON.stringify(body.materials_used) : null,
      has_issues: body.has_issues ?? false,
      issues_description: body.issues_description ?? null,
      delay_reason: body.delay_reason ?? null,
      next_day_plan: body.next_day_plan ?? null,
    },
  });
  return created(report, "Daily report created");
}
