import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created, paginated } from "@/lib/server/helpers";
import { writeAuditLog, getClientIp } from "@/lib/server/audit";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "50"));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    company_id: user.company_id,
    is_active: true,
  };

  if (sp.get("category")) where.category = sp.get("category");
  if (sp.get("search")) {
    where.OR = [
      { name: { contains: sp.get("search"), mode: "insensitive" } },
      { code: { contains: sp.get("search"), mode: "insensitive" } },
      { brand: { contains: sp.get("search"), mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const enriched = items.map((item) => {
    const qtyAvailable = Number(item.qty_on_hand) - Number(item.qty_allocated);
    const isLowStock = qtyAvailable <= Number(item.reorder_level);
    return { ...item, qty_available: qtyAvailable, is_low_stock: isLowStock };
  });

  if (sp.get("lowStockOnly") === "true") {
    const low = enriched.filter((i) => i.is_low_stock);
    return paginated(low, low.length, 1, low.length || 1);
  }

  return paginated(enriched, total, page, limit);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const body = await request.json();
  const { code, name, brand, category, unit, unit_cost, reorder_level, location, description } =
    body;

  if (!code || !name || !category || !unit)
    return err("code, name, category and unit are required");

  const item = await prisma.inventoryItem.create({
    data: {
      company_id: user.company_id,
      code,
      name,
      brand,
      category,
      unit,
      unit_cost: unit_cost ?? null,
      reorder_level: reorder_level ?? 0,
      location,
      description,
    },
  });

  await writeAuditLog({
    companyId: user.company_id,
    actorId: user.id,
    actorRole: user.role,
    actorName: user.full_name,
    action: "CREATE",
    entityType: "InventoryItem",
    entityId: item.id,
    entityLabel: `${item.code} — ${item.name}`,
    newData: item as unknown as Record<string, unknown>,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return created(item);
}
