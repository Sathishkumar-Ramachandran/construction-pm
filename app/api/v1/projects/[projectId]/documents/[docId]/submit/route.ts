import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, docId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager", "safety_officer"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const doc = await prisma.document.findFirst({ where: { id: parseInt(docId), project_id: pid } });
    if (!doc) return err("Document not found", 404);

    await prisma.document.update({
      where: { id: parseInt(docId) },
      data: { status: "submitted", submitted_at: new Date() },
    });

    return ok(null, "Document submitted for review");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
