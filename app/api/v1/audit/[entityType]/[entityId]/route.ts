import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const ALLOWED_ROLES = [
    "super_admin",
    "company_admin",
    "project_manager",
    "consultant",
  ];
  if (!ALLOWED_ROLES.includes(user.role)) return err("Forbidden", 403);

  const { entityType, entityId } = await params;

  const logs = await prisma.auditLog.findMany({
    where: {
      company_id: user.company_id,
      entity_type: entityType,
      entity_id: entityId,
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return ok(logs);
}
