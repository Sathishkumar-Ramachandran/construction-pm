import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";
import { unlink } from "fs/promises";

const DELETE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; photoId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, photoId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const photo = await prisma.photo.findFirst({
    where: { id: parseInt(photoId), project_id: pid },
  });
  if (!photo) return err("Photo not found", 404);

  return ok({
    id: photo.id,
    file_path: photo.file_path,
    photo_type: photo.photo_type,
    entity_type: photo.entity_type,
    caption: photo.caption,
    taken_by: photo.taken_by,
    taken_at: photo.taken_at,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string; photoId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId, photoId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);
  if (!DELETE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const photo = await prisma.photo.findFirst({
    where: { id: parseInt(photoId), project_id: pid },
  });
  if (!photo) return err("Photo not found", 404);

  try {
    await unlink(photo.file_path);
  } catch {
    // File may not exist on disk, continue with DB deletion
  }

  await prisma.photo.delete({ where: { id: parseInt(photoId) } });
  return ok(null, "Photo deleted");
}
