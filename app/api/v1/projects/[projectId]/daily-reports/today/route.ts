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

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const report = await prisma.dailyReport.findFirst({
    where: { project_id: pid, report_date: today },
  });
  if (!report) return ok(null, "No report for today yet");
  return ok(report);
}
