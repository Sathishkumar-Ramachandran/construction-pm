import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { notificationId } = await params;
  const notif = await prisma.notification.findFirst({
    where: { id: parseInt(notificationId), user_id: user.id },
  });
  if (!notif) return err("Notification not found", 404);

  await prisma.notification.update({
    where: { id: parseInt(notificationId) },
    data: { is_read: true },
  });
  return ok(null, "Marked as read");
}
