import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ projectId: string; assignmentId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId, assignmentId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const before = await prisma.workerProjectAssignment.findFirst({
    where: { id: parseInt(assignmentId), project_id: pid },
  });
  if (!before) return err("Assignment not found", 404);

  const body = await request.json();
  const { end_date, status, role, notes } = body;

  const updated = await prisma.workerProjectAssignment.update({
    where: { id: parseInt(assignmentId) },
    data: {
      end_date: end_date ? new Date(end_date) : undefined,
      status: status ?? undefined,
      role: role ?? undefined,
      notes,
    },
  });

  const action = status === "TERMINATED" || status === "TRANSFERRED" ? "UNASSIGN" : "UPDATE";

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action,
    entityType: "WorkerProjectAssignment",
    entityId: updated.id,
    projectId: pid,
    previousData: { status: before.status, end_date: before.end_date },
    newData: { status: updated.status, end_date: updated.end_date, role: updated.role },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
