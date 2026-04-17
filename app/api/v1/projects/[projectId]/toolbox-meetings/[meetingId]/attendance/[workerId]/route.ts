import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string; meetingId: string; workerId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, meetingId, workerId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const att = await prisma.toolboxAttendance.findFirst({
    where: { meeting_id: parseInt(meetingId), worker_id: parseInt(workerId) },
  });
  if (att) {
    await prisma.toolboxAttendance.delete({ where: { id: att.id } });
  }
  return ok(null, "Attendance removed");
}
