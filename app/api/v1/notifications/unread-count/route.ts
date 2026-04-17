import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const count = await prisma.notification.count({
    where: { user_id: user.id, is_read: false },
  });
  return ok({ unread_count: count });
}
