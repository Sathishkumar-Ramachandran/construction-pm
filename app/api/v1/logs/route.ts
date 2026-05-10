import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, err, paginated } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["super_admin", "company_admin"].includes(user.role))
    return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100"));
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (sp.get("level")) where.level = sp.get("level");
  if (sp.get("category")) where.category = sp.get("category");

  if (user.role !== "super_admin") {
    where.company_id = user.company_id;
  }

  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  if (dateFrom || dateTo) {
    where.created_at = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.appLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.appLog.count({ where }),
  ]);

  return paginated(logs, total, page, limit);
}
