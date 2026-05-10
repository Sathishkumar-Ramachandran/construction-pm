import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const now = new Date();
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      company_id: user.company_id,
      status: { in: ["ORDERED", "PARTIAL"] },
      expected_delivery: { lt: now },
    },
    include: {
      project: { select: { id: true, name: true } },
    },
    orderBy: { expected_delivery: "asc" },
  });

  const enriched = orders.map((o) => ({
    id: o.id,
    po_number: o.po_number,
    supplier_name: o.supplier_name,
    expected_delivery: o.expected_delivery,
    days_overdue: Math.floor(
      (now.getTime() - new Date(o.expected_delivery).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    project_id: o.project_id,
    project_name: o.project?.name,
    status: o.status,
    total_value: o.total_value,
  }));

  return ok({
    count: enriched.length,
    earliest_date: enriched[0]?.expected_delivery ?? null,
    orders: enriched,
  });
}
