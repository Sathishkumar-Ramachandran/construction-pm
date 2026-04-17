import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";
import { verifyPassword, hashPassword } from "@/lib/server/auth";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);

    const { current_password, new_password } = await request.json();
    if (!current_password || !new_password) {
      return err("current_password and new_password are required");
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !verifyPassword(current_password, dbUser.password_hash)) {
      return err("Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashPassword(new_password) },
    });

    return ok(null, "Password changed successfully");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
