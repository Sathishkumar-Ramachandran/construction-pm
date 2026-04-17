import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const CREATE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const { searchParams } = new URL(request.url);
  const inspection_type = searchParams.get("inspection_type");

  const inspections = await prisma.inspection.findMany({
    where: {
      project_id: pid,
      ...(inspection_type ? { inspection_type } : {}),
    },
    orderBy: { scheduled_date: "desc" },
  });
  return ok(inspections);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!CREATE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const body = await request.json();
  const inspection = await prisma.inspection.create({
    data: {
      project_id: pid,
      conducted_by: user.id,
      inspection_type: body.inspection_type,
      title: body.title,
      phase_id: body.phase_id ?? null,
      scheduled_date: body.scheduled_date ? new Date(body.scheduled_date) : null,
      scheduled_time: body.scheduled_time ?? null,
      location: body.location ?? null,
      external_inspector_name: body.external_inspector_name ?? null,
      external_inspector_org: body.external_inspector_org ?? null,
      external_inspector_contact: body.external_inspector_contact ?? null,
    },
  });
  return created(inspection, "Inspection scheduled");
}
