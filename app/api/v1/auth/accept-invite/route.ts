import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return err("token and password are required");

    const user = await prisma.user.findFirst({
      where: { invite_token: token, is_invite_accepted: false },
    });
    if (!user) return err("Invalid or already used invite token");

    if (user.invite_expires_at && user.invite_expires_at < new Date()) {
      return err("Invite token has expired. Please ask admin to resend.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashPassword(password),
        is_invite_accepted: true,
        invite_token: null,
        invite_expires_at: null,
      },
    });

    return ok(null, "Password set successfully. You can now log in.");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
