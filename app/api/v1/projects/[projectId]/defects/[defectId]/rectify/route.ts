import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; defectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, defectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const defect = await prisma.defect.findFirst({
    where: { id: parseInt(defectId), project_id: pid },
  });
  if (!defect) return err("Defect not found", 404);

  if (user.role === "worker" && defect.assigned_to_id !== user.id) {
    return err("You can only rectify defects assigned to you", 403);
  }

  await prisma.defect.update({
    where: { id: parseInt(defectId) },
    data: {
      status: "rectified",
      rectified_at: new Date(),
      rectified_by: user.id,
    },
  });
  return ok(null, "Defect marked as rectified");
}
