import { prisma } from "@/lib/db";
import { getAuthUser, requireProjectAccess, ok, created, err } from "@/lib/server/helpers";

const SUBMIT_ROLES = ["super_admin", "company_admin", "project_manager"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { project_id: pid };
    if (status) where.status = status;

    const materials = await prisma.materialSubmittal.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return ok(materials);
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return err("Unauthorized", 401);
    const { projectId } = await params;
    const pid = parseInt(projectId);

    const hasAccess = await requireProjectAccess(user, pid);
    if (!hasAccess) return err("Access denied", 403);
    if (!SUBMIT_ROLES.includes(user.role)) return err("Insufficient permissions", 403);

    const body = await request.json();
    const { material_category, brand, product_name, product_code, colour_code, colour_name,
      tc_colour_ref, estimated_qty, qty_unit, application_area, notes } = body;

    if (!material_category || !brand || !product_name || !estimated_qty || !qty_unit) {
      return err("material_category, brand, product_name, estimated_qty, and qty_unit are required");
    }

    const material = await prisma.materialSubmittal.create({
      data: {
        project_id: pid,
        material_category, brand, product_name,
        product_code: product_code || null,
        colour_code: colour_code || null,
        colour_name: colour_name || null,
        tc_colour_ref: tc_colour_ref || null,
        estimated_qty: parseFloat(estimated_qty),
        qty_unit,
        application_area: application_area || null,
        notes: notes || null,
      },
    });

    return created(material, "Material submittal created");
  } catch (e) {
    console.error(e);
    return err("Internal server error", 500);
  }
}
