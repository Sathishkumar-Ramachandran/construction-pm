import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const CREATE_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const records = await prisma.siteInspection.findMany({
    where: { project_id: pid },
    orderBy: { inspection_date: "desc" },
  });
  return ok(records);
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
  const record = await prisma.siteInspection.create({
    data: {
      project_id: pid,
      conducted_by: user.id,
      inspection_date: new Date(body.inspection_date),
      overall_condition: body.overall_condition ?? null,
      ext_paint_condition: body.ext_paint_condition ?? null,
      ext_plaster_condition: body.ext_plaster_condition ?? null,
      ext_crack_severity: body.ext_crack_severity ?? null,
      spalling_present: body.spalling_present ?? false,
      spalling_description: body.spalling_description ?? null,
      int_paint_condition: body.int_paint_condition ?? null,
      scaffold_type: body.scaffold_type ?? null,
      access_notes: body.access_notes ?? null,
      general_remarks: body.general_remarks ?? null,
    },
  });
  return created(record, "Site inspection created");
}
