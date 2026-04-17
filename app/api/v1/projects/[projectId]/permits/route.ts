import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, created, err } from "@/lib/server/helpers";

const SUBMIT_ROLES = ["super_admin", "company_admin", "project_manager", "safety_officer"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const permits = await prisma.permit.findMany({
      where: { project_id: pid },
      orderBy: { created_at: "asc" },
    });
    return ok(permits);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!SUBMIT_ROLES.includes(user.role)) return err("Insufficient permissions", 403);

    const body = await request.json();
    const { permit_type, title, reference_no, issuing_authority, applied_date, notes } = body;
    if (!permit_type || !title) return err("permit_type and title are required");

    const permit = await prisma.permit.create({
      data: {
        project_id: pid,
        permit_type,
        title,
        reference_no: reference_no || null,
        issuing_authority: issuing_authority || null,
        applied_date: applied_date ? new Date(applied_date) : null,
        notes: notes || null,
      },
    });

    return created(permit, "Permit created");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
