import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["super_admin", "company_admin"].includes(user.role))
    return err("Forbidden", 403);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const where = user.role === "super_admin" ? {} : { company_id: user.company_id };
  const where24h = { ...where, created_at: { gte: since24h } };

  const [total24h, errors24h, warnings24h, byCategory, avgDuration] =
    await Promise.all([
      prisma.appLog.count({ where: where24h }),
      prisma.appLog.count({ where: { ...where24h, level: "ERROR" } }),
      prisma.appLog.count({ where: { ...where24h, level: "WARN" } }),
      prisma.appLog.groupBy({
        by: ["category"],
        where: where24h,
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.appLog.aggregate({
        where: { ...where24h, duration_ms: { not: null } },
        _avg: { duration_ms: true },
      }),
    ]);

  // Top 5 error messages in last 24h
  const topErrors = await prisma.appLog.findMany({
    where: { ...where24h, level: { in: ["ERROR", "CRITICAL"] } },
    orderBy: { created_at: "desc" },
    take: 5,
    select: { message: true, created_at: true, request_path: true },
  });

  return ok({
    last24h: {
      total: total24h,
      errors: errors24h,
      warnings: warnings24h,
    },
    byCategory: byCategory.map((b) => ({
      category: b.category,
      count: b._count.category,
    })),
    topErrors,
    avgResponseTimeMs: Math.round(avgDuration._avg.duration_ms ?? 0),
  });
}
