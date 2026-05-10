import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created } from "@/lib/server/helpers";
import { requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const assignments = await prisma.workerProjectAssignment.findMany({
    where: { project_id: pid },
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          trade: true,
          wah_certified: true,
          wah_cert_expiry: true,
          is_active: true,
        },
      },
      assigned_by: { select: { full_name: true, role: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const now = new Date();
  return ok(
    assignments.map((a) => ({
      ...a,
      wah_cert_expired:
        a.worker.wah_certified && a.worker.wah_cert_expiry
          ? new Date(a.worker.wah_cert_expiry) < now
          : false,
    }))
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const body = await request.json();
  const { worker_id, phase_id, start_date, end_date, role, notes } = body;
  if (!worker_id || !start_date || !role) return err("worker_id, start_date and role required");

  // Validate worker belongs to same company
  const worker = await prisma.worker.findFirst({
    where: { id: worker_id, company_id: user.company_id, is_active: true },
  });
  if (!worker) return err("Worker not found");

  // Check no overlapping active assignment
  const overlap = await prisma.workerProjectAssignment.findFirst({
    where: {
      worker_id,
      status: "ACTIVE",
      end_date: null,
    },
  });
  if (overlap && overlap.project_id !== pid)
    return err("Worker already has an active assignment on another project");

  const assignment = await prisma.workerProjectAssignment.create({
    data: {
      worker_id,
      project_id: pid,
      phase_id: phase_id ?? null,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
      role,
      assigned_by_id: user.id,
      notes,
    },
    include: { worker: true },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "ASSIGN",
    entityType: "WorkerProjectAssignment",
    entityId: assignment.id,
    entityLabel: `${worker.name} assigned to project as ${role}`,
    projectId: pid,
    newData: { worker_id, role, start_date },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return created(assignment);
}
