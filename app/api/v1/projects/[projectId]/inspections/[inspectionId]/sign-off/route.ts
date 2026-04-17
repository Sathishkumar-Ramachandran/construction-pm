import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const SIGN_OFF_ROLES = new Set(["consultant", "tc_officer", "super_admin", "company_admin"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; inspectionId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, inspectionId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!SIGN_OFF_ROLES.has(user.role)) return err("Only consultants/TC officers can sign off inspections", 403);

  const inspection = await prisma.inspection.findFirst({
    where: { id: parseInt(inspectionId), project_id: pid },
  });
  if (!inspection) return err("Inspection not found", 404);

  const body = await request.json();
  await prisma.inspection.update({
    where: { id: parseInt(inspectionId) },
    data: {
      signed_off_by_name: body.signed_off_by_name,
      signed_off_at: new Date(),
      ...(body.overall_remarks ? { overall_remarks: body.overall_remarks } : {}),
    },
  });
  return ok(null, "Inspection signed off");
}
