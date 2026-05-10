import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [records] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        company_id: user.company_id,
        date: { gte: todayStart, lte: todayEnd },
      },
      include: {
        project: { select: { id: true, name: true } },
        worker: { select: { name: true, trade: true } },
        user: { select: { full_name: true, role: true } },
      },
    }),
  ]);

  // Build by-project map from records (which include project name)
  const projectMap = new Map<
    number | null,
    { project_id: number | null; project_name: string | null; present: number; absent: number; half_day: number; other: number }
  >();
  for (const r of records) {
    const pid = r.project_id;
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        project_id: pid,
        project_name: r.project?.name ?? null,
        present: 0, absent: 0, half_day: 0, other: 0,
      });
    }
    const entry = projectMap.get(pid)!;
    if (r.status === "PRESENT") entry.present++;
    else if (r.status === "ABSENT") entry.absent++;
    else if (r.status === "HALF_DAY") entry.half_day++;
    else entry.other++;
  }

  return ok({
    date: todayStart.toISOString().split("T")[0],
    total_records: records.length,
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    half_day: records.filter((r) => r.status === "HALF_DAY").length,
    by_project: Array.from(projectMap.values()),
    records,
  });
}
