import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function GET(
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

    const doc = await prisma.document.findFirst({
      where: { id: parseInt(docId), project_id: pid },
    });
    if (!doc) return err("Document not found", 404);

    return ok(doc);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
