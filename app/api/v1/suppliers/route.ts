import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err, created } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const suppliers = await prisma.supplier.findMany({
    where: { company_id: user.company_id, is_active: true },
    orderBy: { name: "asc" },
  });
  return ok(suppliers);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin", "project_manager"].includes(user.role))
    return err("Forbidden", 403);

  const body = await request.json();
  const { name, contact_person, phone, email, address, notes } = body;
  if (!name) return err("name is required");

  const supplier = await prisma.supplier.create({
    data: { company_id: user.company_id, name, contact_person, phone, email, address, notes },
  });
  return created(supplier);
}
