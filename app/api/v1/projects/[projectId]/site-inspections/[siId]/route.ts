import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; siId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, siId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const record = await prisma.siteInspection.findFirst({
    where: { id: parseInt(siId), project_id: pid },
  });
  if (!record) return err("Site inspection not found", 404);
  return ok(record);
}
