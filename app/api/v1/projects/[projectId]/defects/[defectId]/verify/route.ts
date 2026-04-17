import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const VERIFY_ROLES = new Set(["super_admin", "company_admin", "project_manager", "consultant", "tc_officer", "safety_officer"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string; defectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, defectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!VERIFY_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const defect = await prisma.defect.findFirst({
    where: { id: parseInt(defectId), project_id: pid },
  });
  if (!defect) return err("Defect not found", 404);

  const body = await request.json();
  await prisma.defect.update({
    where: { id: parseInt(defectId) },
    data: {
      status: "verified_ok",
      verified_by: user.id,
      verified_at: new Date(),
      ...(body.verification_remarks ? { verification_remarks: body.verification_remarks } : {}),
    },
  });
  return ok(null, "Defect verified and closed");
}
