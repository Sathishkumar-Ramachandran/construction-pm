import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);

  const items = await prisma.inventoryItem.findMany({
    where: { company_id: user.company_id, is_active: true },
  });

  const lowStock = items
    .map((item) => ({
      ...item,
      qty_available: Number(item.qty_on_hand) - Number(item.qty_allocated),
    }))
    .filter((item) => item.qty_available <= Number(item.reorder_level));

  return ok(lowStock);
}
