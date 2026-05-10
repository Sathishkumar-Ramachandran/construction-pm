import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(sp.get("month") ?? String(new Date().getMonth() + 1));
  const exportCsv = sp.get("export") === "csv";

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      company_id: user.company_id,
      date: { gte: start, lte: end },
    },
    include: {
      worker: { select: { name: true, trade: true } },
      user: { select: { full_name: true, role: true } },
      project: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  if (exportCsv) {
    const headers = ["Date", "Name", "Type", "Trade/Role", "Project", "Status", "Time In", "Time Out", "Overtime Hrs", "Notes"];
    const rows = records.map((r) => {
      const name = r.employee_type === "WORKER" ? r.worker?.name : r.user?.full_name;
      const tradeRole = r.employee_type === "WORKER" ? r.worker?.trade : r.user?.role;
      return [
        new Date(r.date).toLocaleDateString("en-SG"),
        `"${(name ?? "").replace(/"/g, '""')}"`,
        r.employee_type,
        tradeRole ?? "",
        `"${(r.project?.name ?? "").replace(/"/g, '""')}"`,
        r.status,
        r.time_in ? new Date(r.time_in).toLocaleTimeString("en-SG") : "",
        r.time_out ? new Date(r.time_out).toLocaleTimeString("en-SG") : "",
        r.overtime_hours?.toString() ?? "0",
        `"${(r.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance-${year}-${String(month).padStart(2, "0")}.csv"`,
      },
    });
  }

  return ok({ year, month, total: records.length, records });
}
