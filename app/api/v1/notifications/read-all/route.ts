import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  await prisma.notification.updateMany({
    where: { user_id: user.id, is_read: false },
    data: { is_read: true },
  });
  return ok(null, "All notifications marked as read");
}
