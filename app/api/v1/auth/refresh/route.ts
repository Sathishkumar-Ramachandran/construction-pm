import { prisma } from "@/lib/db";
import { hashToken, createAccessToken } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();
    if (!refresh_token) return err("refresh_token required");

    const tokenHash = hashToken(refresh_token);
    const rt = await prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });
    if (!rt || rt.revoked_at || rt.expires_at < new Date()) {
      return err("Invalid or expired refresh token", 401);
    }

    const user = await prisma.user.findFirst({ where: { id: rt.user_id, is_active: true } });
    if (!user) return err("User not found", 401);

    const newAccessToken = await createAccessToken({
      sub: String(user.id),
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      name: user.full_name,
    });

    return ok({ access_token: newAccessToken, token_type: "bearer" });
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
