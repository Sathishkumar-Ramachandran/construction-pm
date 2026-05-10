"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuthStore } from "@/lib/auth-store";
import { api, APIResponse, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, Spinner } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";
import { Download, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";

interface AuditEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  project_id: number | null;
  changed_fields: string[];
  change_reason: string | null;
  created_at: string;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: "bg-blue-100 text-blue-700",
  UPDATE: "bg-gray-100 text-gray-700",
  DELETE: "bg-red-100 text-red-700",
  APPROVE: "bg-green-100 text-green-700",
  REJECT: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-purple-100 text-purple-700",
  SUBMIT: "bg-blue-100 text-blue-700",
  SIGN_OFF: "bg-green-100 text-green-700",
  EXPORT: "bg-gray-100 text-gray-500",
  BULK_UPDATE: "bg-amber-100 text-amber-700",
  MARK_ATTENDANCE: "bg-amber-100 text-amber-700",
};

export default function AuditTrailPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !["company_admin", "super_admin"].includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    projectId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const buildQuery = () => {
    const p = new URLSearchParams({ page: String(page), limit: "50" });
    if (appliedFilters.entityType) p.set("entityType", appliedFilters.entityType);
    if (appliedFilters.action) p.set("action", appliedFilters.action);
    if (appliedFilters.projectId) p.set("projectId", appliedFilters.projectId);
    if (appliedFilters.dateFrom) p.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) p.set("dateTo", appliedFilters.dateTo);
    return p.toString();
  };

  const auditQuery = buildQuery();
  const { data, isLoading } = useSWR<PaginatedResponse<AuditEntry>>(
    `/audit?${auditQuery}`,
    () => api.get<PaginatedResponse<AuditEntry>>(`/audit?${auditQuery}`),
    { keepPreviousData: true }
  );

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const handleExport = () => {
    const p = new URLSearchParams();
    if (appliedFilters.entityType) p.set("entityType", appliedFilters.entityType);
    if (appliedFilters.action) p.set("action", appliedFilters.action);
    if (appliedFilters.projectId) p.set("projectId", appliedFilters.projectId);
    if (appliedFilters.dateFrom) p.set("dateFrom", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) p.set("dateTo", appliedFilters.dateTo);
    window.open(`/api/v1/audit/export?${p.toString()}`);
  };

  const clearFilters = () => {
    const empty = { entityType: "", action: "", projectId: "", dateFrom: "", dateTo: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Audit Trail"
        subtitle="Full change history for compliance"
        actions={
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      <div className="flex-1 p-4 lg:p-6 space-y-4">
        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 w-full hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(appliedFilters).some(Boolean) && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>

          {showFilters && (
            <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
                <input
                  value={filters.entityType}
                  onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                  placeholder="e.g. Permit, Defect"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Actions</option>
                  {["CREATE","UPDATE","DELETE","APPROVE","REJECT","SUBMIT","STATUS_CHANGE","SIGN_OFF","EXPORT","BULK_UPDATE","MARK_ATTENDANCE"].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project ID</label>
                <input
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  placeholder="Project ID"
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                <input
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                <input
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => { setAppliedFilters(filters); setPage(1); }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results summary */}
        {pagination && (
          <p className="text-sm text-gray-500">
            Showing {logs.length} of {pagination.total} entries
          </p>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-6 w-6 text-blue-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No audit entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Time", "Actor", "Action", "Entity", "Details"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-blue-700">
                              {entry.actor_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-xs">{entry.actor_name}</p>
                            <p className="text-gray-400 text-xs capitalize">{entry.actor_role.replace(/_/g, " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${ACTION_BADGE[entry.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {entry.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700">{entry.entity_type}</p>
                        {entry.entity_label && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{entry.entity_label}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.changed_fields.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Changed: {entry.changed_fields.slice(0, 3).join(", ")}
                            {entry.changed_fields.length > 3 && ` +${entry.changed_fields.length - 3} more`}
                          </p>
                        )}
                        {entry.change_reason && (
                          <p className="text-xs text-blue-500 italic">{entry.change_reason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page === pagination.total_pages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
