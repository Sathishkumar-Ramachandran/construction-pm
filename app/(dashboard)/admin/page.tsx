"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuthStore } from "@/lib/auth-store";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner, EmptyState } from "@/components/ui/loading";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  AlertTriangle, RefreshCw, Users, TrendingUp,
  Package, ShoppingCart, Activity, ChevronRight,
  CheckCircle2, AlertCircle, Circle,
} from "lucide-react";

interface OverviewData {
  summary: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    overdueProjects: number;
    totalContractValue: number;
    activeContractValue: number;
  };
  today: {
    date: string;
    totalWorkersOnSite: number;
    attendanceSubmitted: number;
    attendancePending: number;
  };
  alerts: Array<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    message: string;
    projectId?: number;
    projectName?: string;
    count?: number;
  }>;
  projects: Array<{
    id: number;
    name: string;
    status: string;
    town: string;
    contractValue: number | null;
    daysToDeadline: number | null;
    currentPhase: { number: number; name: string; percentComplete: number } | null;
    overallProgress: number;
    team: { pmName: string | null; workerCount: number };
    today: { workersPresent: number; workersTotal: number };
    openDefects: number;
    highSeverityDefects: number;
    pendingPermits: number;
    overdueOrders: number;
    healthScore: number;
    healthStatus: "GREEN" | "AMBER" | "RED";
  }>;
  resources: {
    workers: { total: number; active: number; onSiteToday: number; wahExpired: number };
    orders: { pending: number; overdue: number };
  };
  recentActivity: Array<{
    id: number;
    actor_name: string;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_label: string | null;
    project_id: number | null;
    created_at: string;
  }>;
}

const HEALTH_COLORS = {
  GREEN: { dot: "bg-green-500", bg: "bg-green-50 border-green-200", text: "text-green-700" },
  AMBER: { dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  RED: { dot: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-700" },
};

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
};

function HealthDot({ status }: { status: "GREEN" | "AMBER" | "RED" }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${HEALTH_COLORS[status].dot}`}
    />
  );
}

export default function AdminCommandCentre() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !["company_admin", "super_admin"].includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const { data, error, isLoading, mutate } = useSWR<APIResponse<OverviewData>>(
    "/admin/overview",
    (path: string) => api.get<APIResponse<OverviewData>>(path),
    { refreshInterval: 60000 }
  );

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorBanner message="Failed to load command centre data" />;

  const overview = data?.data;
  if (!overview) return null;

  const criticalAlerts = overview.alerts.filter((a) => a.severity === "CRITICAL");
  const highAlerts = overview.alerts.filter((a) => a.severity === "HIGH");
  const medAlerts = overview.alerts.filter((a) => a.severity === "MEDIUM");

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Command Centre"
        subtitle="Company-wide operations overview"
        actions={
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Alert Banner */}
        {overview.alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Active Alerts</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalAlerts.length > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                  {criticalAlerts.length} Critical
                </span>
              )}
              {highAlerts.length > 0 && (
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                  {highAlerts.length} High
                </span>
              )}
              {medAlerts.length > 0 && (
                <span className="px-3 py-1 bg-amber-400 text-black rounded-full text-sm font-medium">
                  {medAlerts.length} Medium
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Active", value: overview.summary.activeProjects, color: "text-blue-600" },
            { label: "Completed", value: overview.summary.completedProjects, color: "text-green-600" },
            { label: "Overdue", value: overview.summary.overdueProjects, color: "text-red-600" },
            { label: "Workers Today", value: overview.today.totalWorkersOnSite, color: "text-purple-600" },
            { label: "WAH Expired", value: overview.resources.workers.wahExpired, color: "text-red-600" },
            { label: "Orders Overdue", value: overview.resources.orders.overdue, color: "text-orange-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Grid */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Projects ({overview.projects.length})
            </h2>

            {overview.projects.length === 0 && (
              <EmptyState title="No projects" description="No projects found" />
            )}

            {overview.projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/admin/projects/${p.id}`)}
                className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  HEALTH_COLORS[p.healthStatus].bg
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <HealthDot status={p.healthStatus} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.town}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${HEALTH_COLORS[p.healthStatus].text}`}>
                      {p.healthScore}/100
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Phase progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Phase {p.currentPhase?.number ?? "—"}: {p.currentPhase?.name ?? "Not started"}</span>
                    <span>{p.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${p.overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Workers</p>
                    <p className={`font-medium ${p.today.workersPresent < p.today.workersTotal ? "text-amber-600" : "text-green-600"}`}>
                      {p.today.workersPresent}/{p.today.workersTotal}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Defects</p>
                    <p className={`font-medium ${p.highSeverityDefects > 0 ? "text-red-600" : "text-gray-700"}`}>
                      {p.openDefects} ({p.highSeverityDefects} high)
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Permits</p>
                    <p className={`font-medium ${p.pendingPermits > 0 ? "text-amber-600" : "text-green-600"}`}>
                      {p.pendingPermits > 0 ? `${p.pendingPermits} pending` : "All OK"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Orders</p>
                    <p className={`font-medium ${p.overdueOrders > 0 ? "text-red-600" : "text-green-600"}`}>
                      {p.overdueOrders > 0 ? `${p.overdueOrders} late` : "On time"}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                {p.daysToDeadline !== null && (
                  <div className="mt-2 text-xs">
                    {p.daysToDeadline < 0 ? (
                      <span className="text-red-600 font-medium">
                        {Math.abs(p.daysToDeadline)} days overdue
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        {p.daysToDeadline} days to deadline
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right panel: Alerts + Activity */}
          <div className="space-y-4">
            {/* Alerts sidebar */}
            {overview.alerts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Active Alerts
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {overview.alerts.slice(0, 10).map((alert, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${SEVERITY_COLORS[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <p className="text-xs text-gray-700">{alert.message}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.push("/admin/audit")}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  View all alerts →
                </button>
              </div>
            )}

            {/* Activity feed */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Recent Activity
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {overview.recentActivity.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">
                        {entry.actor_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">{entry.actor_name}</span>{" "}
                        {entry.action.toLowerCase()}{" "}
                        {entry.entity_label ?? entry.entity_type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push("/admin/audit")}
                className="text-xs text-blue-600 hover:underline mt-3"
              >
                View full audit log →
              </button>
            </div>

            {/* Resources summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Resources
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Workers (active)</span>
                  <span className="font-medium">{overview.resources.workers.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">On site today</span>
                  <span className="font-medium text-green-600">{overview.resources.workers.onSiteToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">WAH certs expired</span>
                  <span className={`font-medium ${overview.resources.workers.wahExpired > 0 ? "text-red-600" : "text-green-600"}`}>
                    {overview.resources.workers.wahExpired}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending orders</span>
                  <span className="font-medium">{overview.resources.orders.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Overdue orders</span>
                  <span className={`font-medium ${overview.resources.orders.overdue > 0 ? "text-red-600" : "text-green-600"}`}>
                    {overview.resources.orders.overdue}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
