import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    if (!["super_admin", "company_admin"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const { userId } = await params;
    const targetId = parseInt(userId);

    const target = await prisma.user.findFirst({
      where: { id: targetId, company_id: user.company_id },
    });
    if (!target) return err("User not found", 404);

    await prisma.user.update({ where: { id: targetId }, data: { is_active: true } });
    return ok(null, "User activated");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
