import { NextRequest } from "next/server";
import { ok, err, created, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const MANAGE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const pws = await prisma.projectWorker.findMany({
    where: { project_id: pid, is_active: true },
    include: { worker: true },
  });

  const result = pws.map((pw) => ({
    id: pw.id,
    worker_id: pw.worker_id,
    name: pw.worker?.name ?? null,
    trade: pw.worker?.trade ?? null,
    wah_certified: pw.worker?.wah_certified ?? false,
    start_date: pw.start_date,
  }));
  return ok(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!MANAGE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const { searchParams } = new URL(request.url);
  const workerId = parseInt(searchParams.get("worker_id") ?? "0");
  if (!workerId) return err("worker_id is required", 400);

  const existing = await prisma.projectWorker.findFirst({
    where: { project_id: pid, worker_id: workerId },
  });

  if (existing) {
    await prisma.projectWorker.update({ where: { id: existing.id }, data: { is_active: true } });
  } else {
    await prisma.projectWorker.create({
      data: { project_id: pid, worker_id: workerId, start_date: new Date() },
    });
  }
  return ok(null, "Worker assigned to project");
}
