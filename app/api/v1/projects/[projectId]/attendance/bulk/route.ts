import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";
import { AttendanceStatus, EmployeeType } from "@prisma/client";

type Params = { params: Promise<{ projectId: string }> };

type AttendanceInput = {
  worker_id?: number;
  user_id?: number;
  employee_type?: EmployeeType;
  status: AttendanceStatus;
  time_in?: string;
  time_out?: string;
  overtime_hours?: number;
  notes?: string;
};

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const body = await request.json();
  const { date, records } = body as { date: string; records: AttendanceInput[] };

  if (!date || !records || records.length === 0)
    return err("date and records are required");

  const dateObj = new Date(date + "T00:00:00.000Z");

  const ops = records.map(async (r) => {
    const employeeType: EmployeeType = r.employee_type ?? (r.worker_id ? "WORKER" : "USER");

    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        project_id: pid,
        date: dateObj,
        employee_type: employeeType,
        ...(r.worker_id ? { worker_id: r.worker_id } : { user_id: r.user_id }),
      },
    });

    if (existing) {
      return prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          status: r.status,
          time_in: r.time_in ? new Date(r.time_in) : null,
          time_out: r.time_out ? new Date(r.time_out) : null,
          overtime_hours: r.overtime_hours ?? 0,
          notes: r.notes ?? null,
          marked_by_id: user.id,
        },
      });
    }

    return prisma.attendanceRecord.create({
      data: {
        company_id: user.company_id,
        date: dateObj,
        employee_type: employeeType,
        worker_id: r.worker_id ?? null,
        user_id: r.user_id ?? null,
        project_id: pid,
        status: r.status,
        time_in: r.time_in ? new Date(r.time_in) : null,
        time_out: r.time_out ? new Date(r.time_out) : null,
        overtime_hours: r.overtime_hours ?? 0,
        notes: r.notes ?? null,
        marked_by_id: user.id,
      },
    });
  });

  const results = await Promise.allSettled(ops);
  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failCount = results.length - successCount;

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "BULK_UPDATE",
    entityType: "AttendanceRecord",
    entityId: `bulk-${date}`,
    entityLabel: `Bulk attendance for ${date} (${successCount} records)`,
    projectId: pid,
    newData: { date, record_count: successCount, records },
    changedFields: ["status"],
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok({ saved: successCount, failed: failCount, total: records.length });
}
