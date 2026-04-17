import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const notifications = await prisma.notification.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return ok(
    notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      created_at: n.created_at,
    }))
  );
}
