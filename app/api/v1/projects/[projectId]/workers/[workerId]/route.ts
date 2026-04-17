import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const MANAGE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string; workerId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, workerId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!MANAGE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const pw = await prisma.projectWorker.findFirst({
    where: { project_id: pid, worker_id: parseInt(workerId) },
  });
  if (pw) {
    await prisma.projectWorker.update({ where: { id: pw.id }, data: { is_active: false } });
  }
  return ok(null, "Worker removed from project");
}
