import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";

export async function POST(request: Request) {
  try {
    const { token, new_password } = await request.json();
    if (!token || !new_password) return err("token and new_password are required");

    const user = await prisma.user.findFirst({ where: { password_reset_token: token } });
    if (!user) return err("Invalid or expired reset token");

    if (user.password_reset_expires_at && user.password_reset_expires_at < new Date()) {
      return err("Reset token has expired");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashPassword(new_password),
        password_reset_token: null,
        password_reset_expires_at: null,
      },
    });

    return ok(null, "Password reset successfully. You can now log in.");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
