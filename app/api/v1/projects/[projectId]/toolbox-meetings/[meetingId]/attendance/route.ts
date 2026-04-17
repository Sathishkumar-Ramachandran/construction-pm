import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, meetingId } = await params;
  const pid = parseInt(projectId);
  const mid = parseInt(meetingId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const meeting = await prisma.toolboxMeeting.findFirst({
    where: { id: mid, project_id: pid },
  });
  if (!meeting) return err("Meeting not found", 404);

  const body = await request.json();
  if (body.worker_id) {
    const existing = await prisma.toolboxAttendance.findFirst({
      where: { meeting_id: mid, worker_id: body.worker_id },
    });
    if (existing) return ok(null, "Worker already recorded as attended");
  }

  await prisma.toolboxAttendance.create({
    data: {
      meeting_id: mid,
      worker_id: body.worker_id ?? null,
      worker_name: body.worker_name ?? null,
      signed_at: new Date(),
    },
  });
  return ok(null, "Attendance recorded");
}
