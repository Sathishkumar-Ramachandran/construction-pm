import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, paginated } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin"].includes(user.role))
    return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    company_id: user.company_id,
  };

  if (sp.get("entityType")) where.entity_type = sp.get("entityType");
  if (sp.get("entityId")) where.entity_id = sp.get("entityId");
  if (sp.get("actorId")) where.actor_id = parseInt(sp.get("actorId")!);
  if (sp.get("projectId")) where.project_id = parseInt(sp.get("projectId")!);
  if (sp.get("action")) where.action = sp.get("action");

  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  if (dateFrom || dateTo) {
    where.created_at = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginated(logs, total, page, limit);
}
