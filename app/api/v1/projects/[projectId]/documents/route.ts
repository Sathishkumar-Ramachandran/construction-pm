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

    const { searchParams } = new URL(request.url);
    const doc_type = searchParams.get("doc_type");

    const where: Record<string, unknown> = { project_id: pid };
    if (doc_type) where.doc_type = doc_type;

    const docs = await prisma.document.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return ok(docs);
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
    const { doc_type, title, version, remarks, phase_id } = body;
    if (!doc_type || !title) return err("doc_type and title are required");

    const doc = await prisma.document.create({
      data: {
        project_id: pid,
        created_by: user.id,
        doc_type,
        title,
        version: version || "v1.0",
        remarks: remarks || null,
        phase_id: phase_id ? parseInt(phase_id) : null,
      },
    });

    return created(doc, "Document created");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
