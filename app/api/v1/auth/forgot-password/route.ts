import { prisma } from "@/lib/db";
import { generateResetToken } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";
import { sendPasswordResetEmail } from "@/lib/server/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return err("email is required");

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), is_active: true, is_invite_accepted: true },
    });

    if (user) {
      const token = generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { password_reset_token: token, password_reset_expires_at: expiresAt },
      });
      await sendPasswordResetEmail(user.email, user.full_name, token);
    }

    return ok(null, "If this email is registered, a reset link has been sent");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
