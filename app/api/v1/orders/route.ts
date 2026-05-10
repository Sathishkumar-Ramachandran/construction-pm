import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created, paginated } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { company_id: user.company_id };
  if (sp.get("status")) {
    if (sp.get("status") === "overdue") {
      where.status = { in: ["ORDERED", "PARTIAL"] };
      where.expected_delivery = { lt: new Date() };
    } else {
      where.status = sp.get("status")!.toUpperCase();
    }
  }
  if (sp.get("projectId")) where.project_id = parseInt(sp.get("projectId")!);

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        lines: { include: { inventory_item: { select: { name: true, unit: true } } } },
        created_by: { select: { full_name: true } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  const now = new Date();
  const enriched = orders.map((o) => ({
    ...o,
    is_overdue:
      ["ORDERED", "PARTIAL"].includes(o.status) &&
      new Date(o.expected_delivery) < now,
    days_overdue:
      ["ORDERED", "PARTIAL"].includes(o.status) &&
      new Date(o.expected_delivery) < now
        ? Math.floor(
            (now.getTime() - new Date(o.expected_delivery).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0,
  }));

  return paginated(enriched, total, page, limit);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const body = await request.json();
  const {
    project_id,
    phase_id,
    supplier_id,
    supplier_name,
    supplier_contact,
    expected_delivery,
    notes,
    lines,
  } = body;

  if (!supplier_name || !expected_delivery)
    return err("supplier_name and expected_delivery are required");
  if (!lines || lines.length === 0)
    return err("At least one order line is required");

  // Generate PO number
  const count = await prisma.purchaseOrder.count({
    where: { company_id: user.company_id },
  });
  const year = new Date().getFullYear();
  const poNumber = `PO-${year}-${String(count + 1).padStart(4, "0")}`;

  const totalValue = lines.reduce(
    (sum: number, l: { qty_ordered: number; unit_price?: number }) =>
      sum + l.qty_ordered * (l.unit_price ?? 0),
    0
  );

  const order = await prisma.purchaseOrder.create({
    data: {
      company_id: user.company_id,
      po_number: poNumber,
      project_id: project_id ?? null,
      phase_id: phase_id ?? null,
      supplier_id: supplier_id ?? null,
      supplier_name,
      supplier_contact,
      expected_delivery: new Date(expected_delivery),
      total_value: totalValue || null,
      notes,
      created_by_id: user.id,
      lines: {
        create: lines.map(
          (l: {
            inventory_item_id: number;
            qty_ordered: number;
            unit_price?: number;
            description?: string;
            material_submittal_id?: number;
          }) => ({
            inventory_item_id: l.inventory_item_id,
            qty_ordered: l.qty_ordered,
            unit_price: l.unit_price ?? null,
            description: l.description,
            material_submittal_id: l.material_submittal_id ?? null,
          })
        ),
      },
    },
    include: { lines: true },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "CREATE",
    entityType: "PurchaseOrder",
    entityId: order.id,
    entityLabel: `PO ${order.po_number} — ${order.supplier_name}`,
    projectId: project_id,
    newData: { po_number: order.po_number, supplier_name, expected_delivery, total_value: totalValue },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return created(order);
}
