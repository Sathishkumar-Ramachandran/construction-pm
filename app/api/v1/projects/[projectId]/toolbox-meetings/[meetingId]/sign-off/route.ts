import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, meetingId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const meeting = await prisma.toolboxMeeting.findFirst({
    where: { id: parseInt(meetingId), project_id: pid },
  });
  if (!meeting) return err("Meeting not found", 404);

  await prisma.toolboxMeeting.update({
    where: { id: parseInt(meetingId) },
    data: { signed_off_by: user.id, signed_off_at: new Date() },
  });
  return ok(null, "Toolbox meeting signed off");
}
