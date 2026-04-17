import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, err } from "@/lib/server/helpers";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

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

    const doc = await prisma.document.findFirst({ where: { id: parseInt(docId), project_id: pid } });
    if (!doc) return err("Document not found", 404);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return err("No file provided");

    const maxMB = parseInt(process.env.MAX_DOC_SIZE_MB || "25");
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) return err(`File too large. Max ${maxMB}MB`);

    const uploadDir = join(process.env.UPLOAD_DIR || "./uploads", String(user.company_id), String(pid), "documents");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() || "bin";
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    await prisma.document.update({
      where: { id: parseInt(docId) },
      data: { file_path: filePath, file_name: file.name, file_size_kb: Math.round(file.size / 1024) },
    });

    return ok({ file_path: filePath }, "File uploaded");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
