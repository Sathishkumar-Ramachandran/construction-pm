import { prisma } from "@/lib/db";
import { AuditAction, Prisma } from "@prisma/client";

export interface AuditParams {
  companyId: number;
  actorId: number;
  actorRole: string;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string | number;
  entityLabel?: string;
  projectId?: number;
  phaseId?: number;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changedFields?: string[];
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    let fields = params.changedFields;
    if (!fields && params.previousData && params.newData) {
      fields = Object.keys(params.newData).filter(
        (key) =>
          JSON.stringify(params.previousData![key]) !==
          JSON.stringify(params.newData![key])
      );
    }

    await prisma.auditLog.create({
      data: {
        company_id: params.companyId,
        actor_id: params.actorId,
        actor_role: params.actorRole,
        actor_name: params.actorName,
        action: params.action,
        entity_type: params.entityType,
        entity_id: String(params.entityId),
        entity_label: params.entityLabel,
        project_id: params.projectId ?? null,
        phase_id: params.phaseId ?? null,
        previous_data: params.previousData as Prisma.InputJsonValue ?? undefined,
        new_data: params.newData as Prisma.InputJsonValue ?? undefined,
        changed_fields: fields ?? [],
        change_reason: params.changeReason,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
      },
    });
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}

export function sanitiseForAudit(
  data: Record<string, unknown>
): Record<string, unknown> {
  const REDACTED_FIELDS = [
    "password",
    "password_hash",
    "token",
    "refresh_token",
    "invite_token",
    "password_reset_token",
    "secret",
  ];
  const result = { ...data };
  for (const field of REDACTED_FIELDS) {
    if (field in result) result[field] = "[REDACTED]";
  }
  return result;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
