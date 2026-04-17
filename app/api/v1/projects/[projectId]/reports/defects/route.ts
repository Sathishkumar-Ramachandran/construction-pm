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

  const defects = await prisma.defect.findMany({
    where: { project_id: pid },
    orderBy: { raised_at: "desc" },
  });

  const by_status: Record<string, number> = {};
  const by_severity: Record<string, number> = {};
  const by_type: Record<string, number> = {};

  for (const d of defects) {
    by_status[d.status] = (by_status[d.status] ?? 0) + 1;
    by_severity[d.severity] = (by_severity[d.severity] ?? 0) + 1;
    by_type[d.defect_type] = (by_type[d.defect_type] ?? 0) + 1;
  }

  return ok({
    total: defects.length,
    by_status,
    by_severity,
    by_type,
    list: defects.map((d) => ({
      id: d.id,
      defect_no: d.defect_no,
      location_zone: d.location_zone,
      defect_type: d.defect_type,
      severity: d.severity,
      status: d.status,
      raised_at: d.raised_at,
    })),
  });
}
