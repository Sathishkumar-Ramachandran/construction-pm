import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

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

    const material = await prisma.materialSubmittal.findFirst({ where: { id: parseInt(materialId), project_id: pid } });
    if (!material) return err("Material not found", 404);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("No file provided");

    const uploadDir = join("./uploads", String(user.company_id), String(pid), "materials");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "bin";
    const filename = `tds_${uuidv4()}.${ext}`;
    const filePath = join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    await prisma.materialSubmittal.update({ where: { id: parseInt(materialId) }, data: { tds_path: filePath } });

    return ok({ file_path: filePath }, "TDS uploaded");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
