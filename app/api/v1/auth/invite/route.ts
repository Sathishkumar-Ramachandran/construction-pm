import { prisma } from "@/lib/db";
import { hashPassword, generateInviteToken } from "@/lib/server/auth";
import { getAuthUser, ok, created, err } from "@/lib/server/helpers";
import { sendInviteEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    if (!["super_admin", "company_admin"].includes(user.role)) {
      return err("Only admins can invite users", 403);
    }

    const { email, full_name, phone, role } = await request.json();
    if (!email || !full_name || !role) return err("email, full_name, and role are required");

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return err("Email already registered", 409);

    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newUser = await prisma.user.create({
      data: {
        company_id: user.company_id,
        email: email.toLowerCase(),
        password_hash: hashPassword("temporary_placeholder"),
        full_name,
        phone: phone || null,
        role,
        invite_token: token,
        invite_expires_at: expiresAt,
        is_invite_accepted: false,
        created_by: user.id,
      },
    });

    await sendInviteEmail(newUser.email, newUser.full_name, token, role);
    return created({ user_id: newUser.id, email: newUser.email }, "Invite sent successfully");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
