import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const RAISE_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer", "consultant", "tc_officer"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");

  const defects = await prisma.defect.findMany({
    where: {
      project_id: pid,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
    },
    orderBy: { raised_at: "desc" },
  });
  return ok(defects);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!RAISE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const count = await prisma.defect.count({ where: { project_id: pid } });
  const defect_no = `DEF-${String(count + 1).padStart(3, "0")}`;

  const body = await request.json();
  const defect = await prisma.defect.create({
    data: {
      project_id: pid,
      defect_no,
      raised_by: user.id,
      raised_at: new Date(),
      location_zone: body.location_zone,
      location_description: body.location_description ?? null,
      defect_type: body.defect_type,
      severity: body.severity ?? "medium",
      description: body.description ?? null,
      inspection_id: body.inspection_id ?? null,
      phase_id: body.phase_id ?? null,
      target_rectify_date: body.target_rectify_date ? new Date(body.target_rectify_date) : null,
    },
  });
  return created(defect, "Defect raised");
}
