import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["supervisor", "project_manager", "company_admin", "super_admin"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
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

  await prisma.dailyReport.update({
    where: { id: parseInt(reportId) },
    data: { status: "submitted", submitted_at: new Date() },
  });
  return ok(null, "Daily report submitted");
}
