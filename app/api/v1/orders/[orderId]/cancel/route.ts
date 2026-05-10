import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

type Params = { params: Promise<{ orderId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);
  const { orderId } = await params;

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: parseInt(orderId), company_id: user.company_id },
  });
  if (!order) return err("Order not found", 404);
  if (!["DRAFT", "ORDERED"].includes(order.status))
    return err("Only DRAFT or ORDERED orders can be cancelled");

  const body = await request.json().catch(() => ({}));
  const updated = await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "STATUS_CHANGE",
    entityType: "PurchaseOrder",
    entityId: order.id,
    entityLabel: `PO ${order.po_number} cancelled`,
    projectId: order.project_id ?? undefined,
    previousData: { status: order.status },
    newData: { status: "CANCELLED", reason: body.reason },
    changedFields: ["status"],
    changeReason: body.reason,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return ok(updated);
}
