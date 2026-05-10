"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/badge";
import { EntityHistory } from "@/components/audit/entity-history";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Users, Package, ShoppingCart, Shield, History, ArrowLeft } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview", icon: Shield },
  { id: "team", label: "Team & Workers", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "activity", label: "Activity Log", icon: History },
];

export default function AdminProjectDeepDive() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const { data, isLoading, error } = useSWR<APIResponse<Record<string, unknown>>>(
    `/projects/${projectId}`,
    (path: string) => api.get(path),
    { revalidateOnFocus: false }
  );

  const { data: phasesData } = useSWR(
    `/projects/${projectId}/phases`,
    (path: string) => api.get(path)
  );

  const { data: teamData } = useSWR(
    `/projects/${projectId}/team`,
    (path: string) => api.get(path)
  );

  const { data: assignmentsData } = useSWR(
    `/projects/${projectId}/assignments`,
    (path: string) => api.get(path)
  );

  const { data: inventoryData } = useSWR(
    `/projects/${projectId}/inventory`,
    (path: string) => api.get(path)
  );

  const { data: ordersData } = useSWR(
    `/orders?projectId=${projectId}`,
    (path: string) => api.get(path)
  );

  if (isLoading) return <PageLoader />;
  if (error || !data?.data) return <ErrorBanner message="Project not found" />;

  const project = data.data as Record<string, unknown>;
  const phases = (phasesData as APIResponse<unknown[]>)?.data ?? [];
  const team = (teamData as APIResponse<unknown[]>)?.data ?? [];
  const assignments = (assignmentsData as APIResponse<unknown[]>)?.data ?? [];
  const inventory = (inventoryData as APIResponse<unknown[]>)?.data ?? [];
  const orders = (ordersData as { data: unknown[] })?.data ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title={String(project.name ?? "Project")}
        subtitle={`${project.hdb_block} ${project.hdb_street}, ${project.hdb_town}`}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 lg:p-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Status", value: String(project.status ?? ""), colored: true },
                { label: "Contract Value", value: project.contract_value ? `$${Number(project.contract_value).toLocaleString()}` : "—" },
                { label: "Planned Start", value: formatDate(project.planned_start_date as string) },
                { label: "Planned End", value: formatDate(project.planned_end_date as string) },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="font-semibold text-gray-900 mt-1 capitalize">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Phase timeline */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Phase Timeline</h3>
              <div className="space-y-3">
                {(phases as Array<Record<string, unknown>>).map((phase) => (
                  <div key={String(phase.id)} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      phase.status === "completed" ? "bg-green-500 text-white" :
                      phase.status === "in_progress" ? "bg-blue-500 text-white" :
                      "bg-gray-200 text-gray-500"
                    }`}>
                      {String(phase.phase_no)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{String(phase.phase_name)}</span>
                        <span className="text-gray-500 ml-2">{String(phase.completion_pct)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            phase.status === "completed" ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${phase.completion_pct}%` }}
                        />
                      </div>
                    </div>
                    <StatusBadge status={String(phase.status)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Staff Members</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {(team as Array<Record<string, unknown>>).map((t) => (
                  <div key={String(t.id)} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 text-xs font-bold">
                          {String((t.user as Record<string, unknown>)?.full_name ?? "?").charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{String((t.user as Record<string, unknown>)?.full_name ?? "")}</p>
                        <p className="text-xs text-gray-500 capitalize">{String(t.team_role ?? "").replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <StatusBadge status={String(t.team_role ?? "")} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Worker Assignments</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {(assignments as Array<Record<string, unknown>>).map((a) => (
                  <div key={String(a.id)} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{String((a.worker as Record<string, unknown>)?.name ?? "")}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {String(a.role ?? "").replace(/_/g, " ")} ·{" "}
                        {String((a.worker as Record<string, unknown>)?.trade ?? "")}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={String(a.status ?? "")} />
                      {!!(a as Record<string, unknown>).wah_cert_expired && (
                        <p className="text-xs text-red-500 mt-1">WAH expired</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Materials on Site</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {(inventory as Array<Record<string, unknown>>).map((pi) => {
                const item = pi.inventory_item as Record<string, unknown>;
                const allocated = Number(pi.qty_allocated);
                const used = Number(pi.qty_used);
                const pct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
                return (
                  <div key={String(pi.id)} className="px-4 py-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{String(item?.name ?? "")}</span>
                      <span className="text-gray-500">{used}/{allocated} {String(item?.unit ?? "")}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {inventory.length === 0 && (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">No materials allocated</div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {(orders as Array<Record<string, unknown>>).map((o) => (
              <div key={String(o.id)} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{String(o.po_number)}</p>
                    <p className="text-xs text-gray-500">{String(o.supplier_name)}</p>
                  </div>
                  <StatusBadge status={String(o.status ?? "").toLowerCase()} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-600">
                  <span>Expected: {formatDate(o.expected_delivery as string)}</span>
                  {!!(o as Record<string, unknown>).is_overdue && (
                    <span className="text-red-600 font-medium">{String(o.days_overdue)} days late</span>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No orders for this project</div>
            )}
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === "activity" && (
          <EntityHistory entityType="Project" entityId={String(projectId)} projectId={Number(projectId)} />
        )}
      </div>
    </div>
  );
}
