import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, paginated } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { company_id: user.company_id };
  if (sp.get("date")) {
    const d = new Date(sp.get("date")!);
    const dEnd = new Date(sp.get("date")!);
    dEnd.setHours(23, 59, 59, 999);
    where.date = { gte: d, lte: dEnd };
  }
  if (sp.get("projectId")) where.project_id = parseInt(sp.get("projectId")!);
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("employeeType")) where.employee_type = sp.get("employeeType");

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, trade: true } },
        user: { select: { id: true, full_name: true, role: true } },
        project: { select: { id: true, name: true } },
        marked_by: { select: { full_name: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return paginated(records, total, page, limit);
}
