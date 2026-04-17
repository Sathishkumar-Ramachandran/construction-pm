import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; materialId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId, materialId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    if (!["super_admin", "company_admin", "project_manager"].includes(user.role)) {
      return err("Insufficient permissions", 403);
    }

    const material = await prisma.materialSubmittal.findFirst({ where: { id: parseInt(materialId), project_id: pid } });
    if (!material) return err("Material not found", 404);

    await prisma.materialSubmittal.update({
      where: { id: parseInt(materialId) },
      data: { status: "submitted", submitted_by: user.id, submitted_at: new Date() },
    });

    return ok(null, "Material submittal submitted for approval");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
