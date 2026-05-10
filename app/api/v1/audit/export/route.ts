import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, err } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin"].includes(user.role))
    return err("Forbidden", 403);

  const sp = request.nextUrl.searchParams;
  const where: Record<string, unknown> = { company_id: user.company_id };

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

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 10000,
  });

  // Log the export action itself
  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "EXPORT",
    entityType: "AuditLog",
    entityId: "export",
    entityLabel: `Audit log export (${logs.length} records)`,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const headers = [
    "id",
    "created_at",
    "actor_name",
    "actor_role",
    "action",
    "entity_type",
    "entity_id",
    "entity_label",
    "project_id",
    "changed_fields",
    "change_reason",
    "ip_address",
  ];

  const rows = logs.map((l) =>
    [
      l.id,
      l.created_at.toISOString(),
      `"${l.actor_name.replace(/"/g, '""')}"`,
      l.actor_role,
      l.action,
      l.entity_type,
      l.entity_id,
      `"${(l.entity_label ?? "").replace(/"/g, '""')}"`,
      l.project_id ?? "",
      `"${l.changed_fields.join(", ")}"`,
      `"${(l.change_reason ?? "").replace(/"/g, '""')}"`,
      l.ip_address ?? "",
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-log-${date}.csv"`,
    },
  });
}
