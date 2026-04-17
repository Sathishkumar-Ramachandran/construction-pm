import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    if (!["super_admin", "company_admin"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const users = await prisma.user.findMany({
      where: { company_id: user.company_id },
      orderBy: { full_name: "asc" },
      select: {
        id: true,
        company_id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        avatar_path: true,
        is_active: true,
        is_invite_accepted: true,
        last_login_at: true,
        created_at: true,
      },
    });

    return ok(users);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
