import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workerId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const { workerId } = await params;
  const worker = await prisma.worker.findFirst({
    where: { id: parseInt(workerId), company_id: user.company_id },
  });
  if (!worker) return err("Worker not found", 404);

  await prisma.worker.update({
    where: { id: parseInt(workerId) },
    data: { is_active: false },
  });
  return ok(null, "Worker deactivated");
}
