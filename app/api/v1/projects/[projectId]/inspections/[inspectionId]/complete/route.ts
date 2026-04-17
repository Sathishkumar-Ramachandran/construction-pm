import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; inspectionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, inspectionId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const inspection = await prisma.inspection.findFirst({
    where: { id: parseInt(inspectionId), project_id: pid },
  });
  if (!inspection) return err("Inspection not found", 404);

  const body = await request.json();
  await prisma.inspection.update({
    where: { id: parseInt(inspectionId) },
    data: {
      actual_date: body.actual_date ? new Date(body.actual_date) : null,
      actual_time: body.actual_time ?? null,
      status: body.status,
      overall_remarks: body.overall_remarks ?? null,
    },
  });
  return ok(null, "Inspection completed");
}
