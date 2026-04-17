import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const VALID_PHOTO_TYPES = new Set(["before", "during", "after", "defect", "safety", "site_condition", "material", "permit_doc", "general"]);
const VALID_ENTITY_TYPES = new Set(["task", "inspection", "defect", "toolbox_meeting", "site_inspection", "equipment", "daily_report", "material", "permit", "general"]);
const MAX_SIZE_MB = 10;

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return err("No file provided", 400);

  const photo_type = (formData.get("photo_type") as string) ?? "general";
  const entity_type = (formData.get("entity_type") as string) ?? "general";
  const entity_id = formData.get("entity_id") ? parseInt(formData.get("entity_id") as string) : null;
  const phase_id = formData.get("phase_id") ? parseInt(formData.get("phase_id") as string) : null;
  const caption = (formData.get("caption") as string) ?? null;

  if (!VALID_PHOTO_TYPES.has(photo_type)) return err(`Invalid photo_type`, 400);
  if (!VALID_ENTITY_TYPES.has(entity_type)) return err(`Invalid entity_type`, 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > MAX_SIZE_MB) return err(`Photo too large. Max ${MAX_SIZE_MB}MB`, 400);

  const ext = path.extname(file.name || "photo.jpg").toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".heic", ".webp"].includes(ext)) {
    return err("Unsupported file type. Use JPG, PNG, or HEIC.", 400);
  }

  const uploadDir = path.join(
    "./uploads",
    String(user.company_id),
    String(pid),
    "photos",
    String(phase_id ?? "general"),
    entity_type,
  );
  await mkdir(uploadDir, { recursive: true });

  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const now = new Date();
  const photo = await prisma.photo.create({
    data: {
      project_id: pid,
      phase_id,
      entity_type,
      entity_id,
      photo_type,
      file_path: filePath,
      file_name: filename,
      file_size_kb: Math.round(buffer.length / 1024),
      caption,
      taken_by: user.id,
      taken_at: now,
      created_at: now,
    },
  });

  return created({ id: photo.id, file_path: photo.file_path, photo_type: photo.photo_type }, "Photo uploaded successfully");
}
