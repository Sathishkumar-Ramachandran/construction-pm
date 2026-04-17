import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createAccessToken, generateRefreshToken, hashToken } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return err("Email and password are required");

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !verifyPassword(password, user.password_hash)) {
      return err("Invalid email or password", 401);
    }
    if (!user.is_active) return err("Account is deactivated", 403);
    if (!user.is_invite_accepted) return err("Please accept your invite first", 403);

    const tokenData = {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      name: user.full_name,
    };
    const accessToken = await createAccessToken(tokenData);
    const rawRefresh = generateRefreshToken();
    const refreshHash = hashToken(rawRefresh);

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: { user_id: user.id, token_hash: refreshHash, expires_at: expireAt },
    });
    await prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    return ok({
      access_token: accessToken,
      refresh_token: rawRefresh,
      token_type: "bearer",
      user: {
        id: user.id,
        company_id: user.company_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        avatar_path: user.avatar_path,
        is_active: user.is_active,
        is_invite_accepted: user.is_invite_accepted,
      },
    });
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
