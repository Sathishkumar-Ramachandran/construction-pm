import { NextRequest } from "next/server";
import { ok, created, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);
const CREATE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const { searchParams } = new URL(request.url);
  const isActive = searchParams.get("is_active") !== "false";

  const workers = await prisma.worker.findMany({
    where: { company_id: user.company_id, is_active: isActive },
    orderBy: { name: "asc" },
  });
  return ok(workers);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);
  if (!CREATE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const body = await request.json();
  if (!body.name?.trim()) return err("Worker name is required");
  if (!body.trade) return err("Trade is required");

  try {
    const worker = await prisma.worker.create({
      data: {
        company_id: user.company_id,
        name: body.name.trim(),
        work_permit_no: body.work_permit_no?.trim() || null,
        fin_no: body.fin_no?.trim() || null,
        nationality: body.nationality || null,
        trade: body.trade,
        wah_certified: body.wah_certified ?? false,
        wah_cert_expiry: body.wah_cert_expiry ? new Date(body.wah_cert_expiry) : null,
        contact_phone: body.contact_phone?.trim() || null,
      },
    });
    return created(worker, "Worker created");
  } catch (e: unknown) {
    const msg = (e as { code?: string; meta?: { target?: string[] } })?.meta?.target?.includes("fin_no")
      ? "A worker with this FIN number already exists"
      : "Failed to create worker";
    return err(msg);
  }
}
