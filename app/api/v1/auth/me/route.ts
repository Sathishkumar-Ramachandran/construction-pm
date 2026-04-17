import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    return ok({
      id: user.id,
      company_id: user.company_id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      avatar_path: user.avatar_path,
      is_active: user.is_active,
      is_invite_accepted: user.is_invite_accepted,
    });
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);

    const { full_name, phone } = await request.json();
    const data: Record<string, unknown> = {};
    if (full_name !== undefined) data.full_name = full_name;
    if (phone !== undefined) data.phone = phone;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
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
      },
    });

    return ok(updated);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
