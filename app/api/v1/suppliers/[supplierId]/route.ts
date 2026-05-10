import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

type Params = { params: Promise<{ supplierId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  const { supplierId } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id: parseInt(supplierId), company_id: user.company_id },
    include: {
      purchase_orders: {
        orderBy: { created_at: "desc" },
        take: 10,
        select: { id: true, po_number: true, status: true, expected_delivery: true, total_value: true },
      },
    },
  });
  if (!supplier) return err("Supplier not found", 404);
  return ok(supplier);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);
  const { supplierId } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id: parseInt(supplierId), company_id: user.company_id },
  });
  if (!supplier) return err("Supplier not found", 404);

  const body = await request.json();
  const updated = await prisma.supplier.update({
    where: { id: parseInt(supplierId) },
    data: {
      name: body.name,
      contact_person: body.contact_person,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      is_active: body.is_active,
    },
  });
  return ok(updated);
}
