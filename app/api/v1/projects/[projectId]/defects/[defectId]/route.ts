import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const UPDATE_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; defectId: string }> }) {
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
  return ok(defect);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string; defectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, defectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!UPDATE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const defect = await prisma.defect.findFirst({
    where: { id: parseInt(defectId), project_id: pid },
  });
  if (!defect) return err("Defect not found", 404);

  const body = await request.json();
  const updated = await prisma.defect.update({
    where: { id: parseInt(defectId) },
    data: {
      ...(body.location_zone !== undefined ? { location_zone: body.location_zone } : {}),
      ...(body.defect_type !== undefined ? { defect_type: body.defect_type } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.assigned_to_id !== undefined ? { assigned_to_id: body.assigned_to_id } : {}),
      ...(body.target_rectify_date !== undefined ? { target_rectify_date: body.target_rectify_date ? new Date(body.target_rectify_date) : null } : {}),
    },
  });
  return ok(updated);
}
