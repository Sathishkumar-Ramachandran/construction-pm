import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/server/auth";
import { ok, err } from "@/lib/server/helpers";

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();
    if (refresh_token) {
      const tokenHash = hashToken(refresh_token);
      await prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash },
        data: { revoked_at: new Date() },
      });
    }
    return ok(null, "Logged out successfully");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
