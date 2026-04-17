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

  const [permits, docs, materials, meetingsCount] = await Promise.all([
    prisma.permit.findMany({ where: { project_id: pid } }),
    prisma.document.findMany({ where: { project_id: pid } }),
    prisma.materialSubmittal.findMany({ where: { project_id: pid } }),
    prisma.toolboxMeeting.count({ where: { project_id: pid, signed_off_at: { not: null } } }),
  ]);

  return ok({
    permits: permits.map((p) => ({ type: p.permit_type, title: p.title, status: p.status, expiry_date: p.expiry_date })),
    documents: docs.map((d) => ({ type: d.doc_type, title: d.title, status: d.status, version: d.version })),
    materials: materials.map((m) => ({ brand: m.brand, product: m.product_name, category: m.material_category, status: m.status })),
    toolbox_meetings_conducted: meetingsCount,
  });
}
