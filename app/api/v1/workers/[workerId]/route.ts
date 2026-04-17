import { NextRequest } from "next/server";
import { ok, err, getAuthUser } from "@/lib/server/helpers";
import prisma from "@/lib/db";

const ALLOWED_ROLES = new Set(["super_admin", "company_admin", "project_manager", "supervisor"]);
const UPDATE_ROLES = new Set(["super_admin", "company_admin", "project_manager"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ workerId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);
  if (!ALLOWED_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const { workerId } = await params;
  const worker = await prisma.worker.findFirst({
    where: { id: parseInt(workerId), company_id: user.company_id },
  });
  if (!worker) return err("Worker not found", 404);
  return ok(worker);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workerId: string }> }) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorized", 401);
  if (!UPDATE_ROLES.has(user.role)) return err("Insufficient permissions", 403);

  const { workerId } = await params;
  const worker = await prisma.worker.findFirst({
    where: { id: parseInt(workerId), company_id: user.company_id },
  });
  if (!worker) return err("Worker not found", 404);

  const body = await request.json();
  const updated = await prisma.worker.update({
    where: { id: parseInt(workerId) },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      work_permit_no: body.work_permit_no !== undefined ? body.work_permit_no : undefined,
      fin_no: body.fin_no !== undefined ? body.fin_no : undefined,
      nationality: body.nationality !== undefined ? body.nationality : undefined,
      trade: body.trade !== undefined ? body.trade : undefined,
      wah_certified: body.wah_certified !== undefined ? body.wah_certified : undefined,
      wah_cert_expiry: body.wah_cert_expiry !== undefined ? (body.wah_cert_expiry ? new Date(body.wah_cert_expiry) : null) : undefined,
      contact_phone: body.contact_phone !== undefined ? body.contact_phone : undefined,
    },
  });
  return ok(updated);
}
