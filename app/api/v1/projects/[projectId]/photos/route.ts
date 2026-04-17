import { NextRequest } from "next/server";
import { ok, err, getAuthUser, requireProjectAccess } from "@/lib/server/helpers";
import prisma from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);

  const { projectId } = await params;
  const pid = parseInt(projectId);
  const hasAccess = await requireProjectAccess(user, pid);
  if (!hasAccess) return err("Project not found or access denied", 403);

  const { searchParams } = new URL(request.url);
  const photo_type = searchParams.get("photo_type");
  const entity_type = searchParams.get("entity_type");
  const entity_id = searchParams.get("entity_id");
  const phase_id = searchParams.get("phase_id");

  const photos = await prisma.photo.findMany({
    where: {
      project_id: pid,
      ...(photo_type ? { photo_type } : {}),
      ...(entity_type ? { entity_type } : {}),
      ...(entity_id ? { entity_id: parseInt(entity_id) } : {}),
      ...(phase_id ? { phase_id: parseInt(phase_id) } : {}),
    },
    orderBy: { taken_at: "desc" },
  });

  const result = photos.map((p) => ({
    id: p.id,
    photo_type: p.photo_type,
    entity_type: p.entity_type,
    entity_id: p.entity_id,
    phase_id: p.phase_id,
    file_path: p.file_path,
    thumbnail_path: p.thumbnail_path,
    caption: p.caption,
    taken_by: p.taken_by,
    taken_at: p.taken_at,
  }));
  return ok(result);
}
