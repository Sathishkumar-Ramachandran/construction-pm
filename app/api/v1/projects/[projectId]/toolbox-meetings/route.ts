import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const meetings = await prisma.toolboxMeeting.findMany({
    where: { project_id: pid },
    orderBy: { meeting_date: "desc" },
  });
  return ok(meetings);
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
  const meeting = await prisma.toolboxMeeting.create({
    data: {
      project_id: pid,
      conducted_by: user.id,
      meeting_date: new Date(body.meeting_date),
      meeting_time: body.meeting_time ?? null,
      location: body.location ?? null,
      topics_covered: JSON.stringify(body.topics_covered ?? []),
      work_plan_today: body.work_plan_today ?? null,
      hazards_discussed: JSON.stringify(body.hazards_discussed ?? []),
      controls_discussed: JSON.stringify(body.controls_discussed ?? []),
      total_workers: body.total_workers ?? null,
      remarks: body.remarks ?? null,
    },
  });
  return created(meeting, "Toolbox meeting created");
}
