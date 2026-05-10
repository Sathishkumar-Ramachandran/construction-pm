import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, ok, err } from "@/lib/server/helpers";

function computeHealthScore(p: {
  plannedEndDate: Date | null;
  expiredPermits: number;
  overdueOrders: number;
  highDefects: number;
}): number {
  let score = 100;
  const now = new Date();

  if (p.plannedEndDate && p.plannedEndDate < now) score -= 20;
  score -= Math.min(30, p.expiredPermits * 10);
  score -= Math.min(20, p.overdueOrders * 5);
  score -= Math.min(20, p.highDefects * 5);

  return Math.max(0, Math.min(100, score));
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return err("Unauthorised", 401);
  if (!["company_admin", "super_admin"].includes(user.role))
    return err("Forbidden", 403);

  const companyId = user.company_id;
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    allProjects,
    totalWorkers,
    activeWorkers,
    wahExpired,
    wahExpiring30,
    lowStockItems,
    pendingOrders,
    overdueOrdersAll,
    recentActivity,
    todayAttendance,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { company_id: companyId },
      include: {
        phases: { orderBy: { phase_no: "asc" } },
        team: { where: { is_active: true }, include: { user: { select: { id: true, full_name: true, role: true } } } },
        permits: true,
        defects: { where: { status: { in: ["open", "in_progress"] } } },
        purchase_orders: { where: { status: { in: ["ORDERED", "PARTIAL"] } } },
        project_workers: { where: { is_active: true } },
      },
    }),
    prisma.worker.count({ where: { company_id: companyId } }),
    prisma.worker.count({ where: { company_id: companyId, is_active: true } }),
    prisma.worker.count({
      where: {
        company_id: companyId,
        wah_certified: true,
        wah_cert_expiry: { lt: now },
      },
    }),
    prisma.worker.count({
      where: {
        company_id: companyId,
        wah_certified: true,
        wah_cert_expiry: {
          gte: now,
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.inventoryItem.count({
      where: {
        company_id: companyId,
        is_active: true,
      },
    }),
    prisma.purchaseOrder.count({
      where: { company_id: companyId, status: { in: ["DRAFT", "ORDERED", "PARTIAL"] } },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        company_id: companyId,
        status: { in: ["ORDERED", "PARTIAL"] },
        expected_delivery: { lt: now },
      },
      include: { project: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: "desc" },
      take: 20,
    }),
    prisma.attendanceRecord.groupBy({
      by: ["project_id"],
      where: {
        company_id: companyId,
        date: { gte: todayStart },
        status: "PRESENT",
      },
      _count: { id: true },
    }),
  ]);

  const activeProjects = allProjects.filter((p) => p.status === "in_progress");
  const completedProjects = allProjects.filter((p) => p.status === "completed");
  const onHoldProjects = allProjects.filter((p) => p.status === "on_hold");
  const overdueProjects = allProjects.filter(
    (p) =>
      p.planned_end_date &&
      new Date(p.planned_end_date) < now &&
      p.status !== "completed"
  );

  const totalContractValue = allProjects.reduce(
    (sum, p) => sum + (p.contract_value ?? 0),
    0
  );
  const activeContractValue = activeProjects.reduce(
    (sum, p) => sum + (p.contract_value ?? 0),
    0
  );

  // Alerts
  const alerts: Array<{
    type: string;
    severity: string;
    message: string;
    projectId?: number;
    projectName?: string;
    entityId?: number;
    count?: number;
  }> = [];

  if (overdueOrdersAll.length > 0) {
    alerts.push({
      type: "ORDER_OVERDUE",
      severity: "CRITICAL",
      message: `${overdueOrdersAll.length} purchase order(s) are overdue`,
      count: overdueOrdersAll.length,
    });
  }

  const expiredPermits = allProjects.flatMap((p) =>
    p.permits.filter((pm) => pm.expiry_date && new Date(pm.expiry_date) < now)
  );
  if (expiredPermits.length > 0) {
    alerts.push({
      type: "PERMIT_EXPIRED",
      severity: "CRITICAL",
      message: `${expiredPermits.length} permit(s) have expired`,
      count: expiredPermits.length,
    });
  }

  if (wahExpired > 0) {
    alerts.push({
      type: "WAH_CERT_EXPIRED",
      severity: "HIGH",
      message: `${wahExpired} worker(s) have expired WAH certificates`,
      count: wahExpired,
    });
  }

  overdueProjects.forEach((p) => {
    alerts.push({
      type: "PROJECT_OVERDUE",
      severity: "HIGH",
      message: `Project "${p.name}" is past planned end date`,
      projectId: p.id,
      projectName: p.name,
    });
  });

  // Per-project data
  const todayAttMap = new Map(
    todayAttendance.map((a) => [a.project_id, a._count.id])
  );

  const projectsData = allProjects.map((p) => {
    const completedPhases = p.phases.filter((ph) => ph.status === "completed").length;
    const totalPhases = p.phases.length || 7;
    const overallProgress = Math.round((completedPhases / totalPhases) * 100);
    const currentPhase =
      p.phases.find((ph) => ph.status === "in_progress") ||
      p.phases.find((ph) => ph.status !== "completed") ||
      p.phases[p.phases.length - 1];

    const expiredPermsCount = p.permits.filter(
      (pm) => pm.expiry_date && new Date(pm.expiry_date) < now
    ).length;
    const overdueOrdersCount = p.purchase_orders.filter(
      (o) => new Date(o.expected_delivery) < now
    ).length;
    const highDefectsCount = p.defects.filter((d) => d.severity === "high").length;
    const daysToDeadline = p.planned_end_date
      ? Math.round(
          (new Date(p.planned_end_date).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const healthScore = computeHealthScore({
      plannedEndDate: p.planned_end_date,
      expiredPermits: expiredPermsCount,
      overdueOrders: overdueOrdersCount,
      highDefects: highDefectsCount,
    });

    const pm = p.team.find((t) => t.team_role === "project_manager");

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      town: p.hdb_town,
      contractValue: p.contract_value,
      plannedStart: p.planned_start_date,
      plannedEnd: p.planned_end_date,
      daysToDeadline,
      currentPhase: currentPhase
        ? {
            number: currentPhase.phase_no,
            name: currentPhase.phase_name,
            percentComplete: currentPhase.completion_pct,
          }
        : null,
      overallProgress,
      team: {
        pmName: pm?.user?.full_name ?? null,
        supervisorCount: p.team.filter((t) => t.team_role === "supervisor").length,
        workerCount: p.project_workers.length,
      },
      today: {
        workersPresent: todayAttMap.get(p.id) ?? 0,
        workersTotal: p.project_workers.length,
      },
      openDefects: p.defects.length,
      highSeverityDefects: highDefectsCount,
      pendingPermits: p.permits.filter((pm) => pm.status === "submitted").length,
      expiredPermits: expiredPermsCount,
      overdueOrders: overdueOrdersCount,
      healthScore,
      healthStatus:
        healthScore >= 75 ? "GREEN" : healthScore >= 40 ? "AMBER" : "RED",
    };
  });

  const onSiteToday = todayAttendance.reduce((s, a) => s + a._count.id, 0);

  return ok({
    summary: {
      totalProjects: allProjects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      onHoldProjects: onHoldProjects.length,
      overdueProjects: overdueProjects.length,
      totalContractValue,
      activeContractValue,
    },
    today: {
      date: todayStart.toISOString().split("T")[0],
      totalWorkersOnSite: onSiteToday,
      attendanceSubmitted: todayAttendance.length,
      attendancePending: activeProjects.length - todayAttendance.length,
      toolboxMeetingsHeld: 0,
      dailyReportsSubmitted: 0,
    },
    alerts: alerts.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
      return (order[a.severity as keyof typeof order] ?? 3) -
        (order[b.severity as keyof typeof order] ?? 3);
    }),
    projects: projectsData,
    resources: {
      inventory: {
        totalItems: lowStockItems,
        lowStockItems: 0,
        totalValue: 0,
      },
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        onSiteToday,
        wahExpiringIn30Days: wahExpiring30,
        wahExpired,
      },
      orders: {
        pending: pendingOrders,
        overdue: overdueOrdersAll.length,
        overdueValue: overdueOrdersAll.reduce(
          (s, o) => s + Number(o.total_value ?? 0),
          0
        ),
      },
    },
    recentActivity,
  });
}
