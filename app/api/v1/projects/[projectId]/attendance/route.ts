import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created, requireProjectAccess } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";
import { AttendanceStatus } from "@prisma/client";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const dateStr = sp.get("date") ?? new Date().toISOString().split("T")[0];
  const dateObj = new Date(dateStr + "T00:00:00.000Z");
  const dateEnd = new Date(dateStr + "T23:59:59.999Z");

  // Workers from active assignments (consistent with assignments page)
  const activeAssignments = await prisma.workerProjectAssignment.findMany({
    where: { project_id: pid, status: "ACTIVE" },
    include: { worker: { select: { id: true, name: true, trade: true, wah_certified: true } } },
  });

  // Project team members (users/staff)
  const teamMembers = await prisma.projectTeam.findMany({
    where: { project_id: pid, is_active: true },
    include: { user: { select: { id: true, full_name: true, role: true } } },
  });

  // Existing attendance records for this date
  const workerRecords = await prisma.attendanceRecord.findMany({
    where: { project_id: pid, date: { gte: dateObj, lte: dateEnd }, employee_type: "WORKER" },
  });
  const userRecords = await prisma.attendanceRecord.findMany({
    where: { project_id: pid, date: { gte: dateObj, lte: dateEnd }, employee_type: "USER" },
  });

  const workerMap = new Map(workerRecords.map((r) => [r.worker_id, r]));
  const userMap = new Map(userRecords.map((r) => [r.user_id, r]));

  // Deduplicate workers (a worker may be assigned multiple times)
  const seenWorkerIds = new Set<number>();
  const uniqueWorkers = activeAssignments.filter((a) => {
    if (seenWorkerIds.has(a.worker_id)) return false;
    seenWorkerIds.add(a.worker_id);
    return true;
  });

  const workerSummary = uniqueWorkers.map((a) => ({
    worker: a.worker,
    attendance: workerMap.get(a.worker_id) ?? null,
    status: workerMap.get(a.worker_id)?.status ?? "NOT_MARKED",
  }));

  const staffSummary = teamMembers.map((t) => ({
    user: t.user,
    attendance: userMap.get(t.user_id) ?? null,
    status: userMap.get(t.user_id)?.status ?? "NOT_MARKED",
  }));

  const allPresent = workerRecords.filter((r) => r.status === "PRESENT").length
    + userRecords.filter((r) => r.status === "PRESENT").length;
  const allAbsent = workerRecords.filter((r) => r.status === "ABSENT").length
    + userRecords.filter((r) => r.status === "ABSENT").length;
  const allHalfDay = workerRecords.filter((r) => r.status === "HALF_DAY").length
    + userRecords.filter((r) => r.status === "HALF_DAY").length;
  const totalPeople = uniqueWorkers.length + teamMembers.length;
  const markedCount = workerRecords.length + userRecords.length;

  return ok({
    date: dateStr,
    total_workers: uniqueWorkers.length,
    total_staff: teamMembers.length,
    present: allPresent,
    absent: allAbsent,
    half_day: allHalfDay,
    unmarked: totalPeople - markedCount,
    workers: workerSummary,
    staff: staffSummary,
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { projectId } = await params;
  const pid = parseInt(projectId);
  if (!(await requireProjectAccess(user, pid))) return err("Forbidden", 403);

  const body = await request.json();
  const { worker_id, user_id, employee_type, date, status, time_in, time_out, overtime_hours, notes } = body;
  if ((!worker_id && !user_id) || !date || !status) return err("(worker_id or user_id), date and status are required");

  const validStatuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "MC", "ANNUAL_LEAVE", "PUBLIC_HOLIDAY", "OFF_DAY"];
  if (!validStatuses.includes(status)) return err(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);

  const empType = employee_type ?? (worker_id ? "WORKER" : "USER");
  const dateObj = new Date(date + "T00:00:00.000Z");

  const existing = await prisma.attendanceRecord.findFirst({
    where: {
      project_id: pid,
      date: dateObj,
      employee_type: empType,
      ...(worker_id ? { worker_id } : { user_id }),
    },
  });

  let record;
  if (existing) {
    record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        status: status as AttendanceStatus,
        time_in: time_in ? new Date(time_in) : null,
        time_out: time_out ? new Date(time_out) : null,
        overtime_hours: overtime_hours ?? 0,
        notes,
        marked_by_id: user.id,
      },
    });
  } else {
    record = await prisma.attendanceRecord.create({
      data: {
        company_id: user.company_id,
        date: dateObj,
        employee_type: empType,
        worker_id: worker_id ?? null,
        user_id: user_id ?? null,
        project_id: pid,
        status: status as AttendanceStatus,
        time_in: time_in ? new Date(time_in) : null,
        time_out: time_out ? new Date(time_out) : null,
        overtime_hours: overtime_hours ?? 0,
        notes,
        marked_by_id: user.id,
      },
    });
  }

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "MARK_ATTENDANCE",
    entityType: "AttendanceRecord",
    entityId: record.id,
    projectId: pid,
    newData: { worker_id, user_id, date, status, employee_type: empType },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return created(record);
}
