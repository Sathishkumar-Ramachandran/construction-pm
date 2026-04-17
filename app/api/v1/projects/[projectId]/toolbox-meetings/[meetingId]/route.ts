import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; meetingId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, meetingId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const meeting = await prisma.toolboxMeeting.findFirst({
    where: { id: parseInt(meetingId), project_id: pid },
    include: {
      attendance: {
        include: { worker: { select: { name: true } } },
      },
    },
  });
  if (!meeting) return err("Meeting not found", 404);

  const data = {
    ...meeting,
    attendance: meeting.attendance.map((a) => ({
      id: a.id,
      worker_id: a.worker_id,
      worker_name: a.worker_name ?? a.worker?.name ?? null,
      signed_at: a.signed_at,
    })),
  };
  return ok(data);
}
