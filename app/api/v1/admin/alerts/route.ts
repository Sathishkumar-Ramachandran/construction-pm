import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin"].includes(user.role))
    return err("Forbidden", 403);

  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const companyId = user.company_id;

  const [projects, workers, overdueOrders] = await Promise.all([
    prisma.project.findMany({
      where: { company_id: companyId },
      include: {
        permits: true,
        defects: { where: { status: { in: ["open", "in_progress"] } } },
        purchase_orders: {
          where: { status: { in: ["ORDERED", "PARTIAL"] }, expected_delivery: { lt: now } },
        },
      },
    }),
    prisma.worker.findMany({
      where: { company_id: companyId, is_active: true, wah_certified: true },
      select: { id: true, name: true, wah_cert_expiry: true },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        company_id: companyId,
        status: { in: ["ORDERED", "PARTIAL"] },
        expected_delivery: { lt: now },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { expected_delivery: "asc" },
    }),
  ]);

  const alerts: Array<{
    type: string;
    severity: string;
    message: string;
    projectId?: number;
    projectName?: string;
    entityId?: number;
    count?: number;
  }> = [];

  // Overdue orders
  overdueOrders.forEach((o) => {
    const daysLate = Math.floor(
      (now.getTime() - new Date(o.expected_delivery).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    alerts.push({
      type: "ORDER_OVERDUE",
      severity: daysLate > 7 ? "CRITICAL" : "HIGH",
      message: `PO ${o.po_number} from ${o.supplier_name} is ${daysLate} day(s) overdue`,
      projectId: o.project_id ?? undefined,
      projectName: o.project?.name,
      entityId: o.id,
    });
  });

  // Expired / expiring permits
  projects.forEach((p) => {
    p.permits.forEach((pm) => {
      if (!pm.expiry_date) return;
      const expiry = new Date(pm.expiry_date);
      if (expiry < now) {
        alerts.push({
          type: "PERMIT_EXPIRED",
          severity: "CRITICAL",
          message: `${pm.permit_type} permit for ${p.name} has expired`,
          projectId: p.id,
          projectName: p.name,
          entityId: pm.id,
        });
      } else if (expiry <= in30Days) {
        alerts.push({
          type: "PERMIT_EXPIRING",
          severity: "MEDIUM",
          message: `${pm.permit_type} permit for ${p.name} expires on ${expiry.toLocaleDateString("en-SG")}`,
          projectId: p.id,
          projectName: p.name,
          entityId: pm.id,
        });
      }
    });

    // Overdue defects
    const overdueDefects = p.defects.filter(
      (d) =>
        d.severity === "high" &&
        d.target_rectify_date &&
        new Date(d.target_rectify_date) < now
    );
    if (overdueDefects.length > 0) {
      alerts.push({
        type: "DEFECT_OVERDUE",
        severity: "HIGH",
        message: `${overdueDefects.length} high-severity defect(s) overdue for rectification on ${p.name}`,
        projectId: p.id,
        projectName: p.name,
        count: overdueDefects.length,
      });
    }

    // Overdue project
    if (
      p.planned_end_date &&
      new Date(p.planned_end_date) < now &&
      p.status !== "completed"
    ) {
      alerts.push({
        type: "PROJECT_OVERDUE",
        severity: "HIGH",
        message: `Project "${p.name}" is past its planned end date`,
        projectId: p.id,
        projectName: p.name,
      });
    }
  });

  // WAH certs
  workers.forEach((w) => {
    if (!w.wah_cert_expiry) return;
    const expiry = new Date(w.wah_cert_expiry);
    if (expiry < now) {
      alerts.push({
        type: "WAH_CERT_EXPIRED",
        severity: "HIGH",
        message: `Worker ${w.name} has an expired WAH certificate`,
        entityId: w.id,
      });
    } else if (expiry <= in30Days) {
      alerts.push({
        type: "WAH_CERT_EXPIRING",
        severity: "MEDIUM",
        message: `Worker ${w.name}'s WAH certificate expires on ${expiry.toLocaleDateString("en-SG")}`,
        entityId: w.id,
      });
    }
  });

  // Sort by severity
  const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  alerts.sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  return ok({ total: alerts.length, alerts });
}
