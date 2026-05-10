"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Plus, X, UserPlus, AlertTriangle, ArrowLeft } from "lucide-react";

interface WorkerAssignment {
  id: number;
  role: string;
  status: string;
  start_date: string;
  end_date: string | null;
  wah_cert_expired: boolean;
  worker: {
    id: number;
    name: string;
    trade: string;
    wah_certified: boolean;
    wah_cert_expiry: string | null;
    is_active: boolean;
  };
}

interface Worker {
  id: number;
  name: string;
  trade: string;
  wah_certified: boolean;
  wah_cert_expiry: string | null;
}

const WORKER_ROLES = [
  "PAINTER", "PLASTERER", "SCAFFOLDER", "WATERPROOFER",
  "GENERAL_WORKER", "SUPERVISOR", "SAFETY_OFFICER",
];

const ROLE_LABELS: Record<string, string> = {
  PAINTER: "Painter", PLASTERER: "Plasterer", SCAFFOLDER: "Scaffolder",
  WATERPROOFER: "Waterproofer", GENERAL_WORKER: "General Worker",
  SUPERVISOR: "Supervisor", SAFETY_OFFICER: "Safety Officer",
};

export default function AssignmentsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [form, setForm] = useState({
    worker_id: "",
    role: "PAINTER",
    start_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const { data, isLoading, error, mutate } = useSWR<APIResponse<WorkerAssignment[]>>(
    `/projects/${projectId}/assignments`,
    () => api.get<APIResponse<WorkerAssignment[]>>(`/projects/${projectId}/assignments`)
  );

  const { data: workersData } = useSWR<APIResponse<Worker[]>>(
    "/workers",
    () => api.get<APIResponse<Worker[]>>("/workers")
  );

  const assignments = data?.data ?? [];
  const workers = (workersData?.data as unknown as Worker[]) ?? [];
  const activeAssignments = assignments.filter((a) => a.status === "ACTIVE");
  const wahExpiredCount = activeAssignments.filter((a) => a.wah_cert_expired).length;

  const handleAssign = async () => {
    if (!form.worker_id) { setFormError("Please select a worker"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await api.post(`/projects/${projectId}/assignments`, {
        worker_id: parseInt(form.worker_id),
        role: form.role,
        start_date: form.start_date,
        notes: form.notes || undefined,
      });
      setShowAssignSheet(false);
      setForm({ worker_id: "", role: "PAINTER", start_date: new Date().toISOString().split("T")[0], notes: "" });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to assign worker";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndAssignment = async (assignmentId: number) => {
    if (!confirm("End this assignment?")) return;
    await api.patch(`/projects/${projectId}/assignments/${assignmentId}`, {
      status: "COMPLETED",
      end_date: new Date().toISOString().split("T")[0],
    });
    mutate();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Worker Assignments"
        subtitle={`Project ${projectId}`}
        actions={
          <button
            onClick={() => setShowAssignSheet(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <UserPlus className="w-5 h-5" />
            Assign
          </button>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {/* WAH alert */}
        {wahExpiredCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {wahExpiredCount} worker{wahExpiredCount > 1 ? "s have" : " has"} an expired WAH certificate
            </p>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-blue-600" /></div>}
        {error && <ErrorBanner message="Failed to load assignments" />}

        {!isLoading && assignments.length === 0 && (
          <EmptyState
            title="No workers assigned"
            description="Assign workers to this project to track their attendance and activities"
          />
        )}

        {/* Active */}
        {activeAssignments.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Active ({activeAssignments.length})
            </h3>
            <div className="space-y-3">
              {activeAssignments.map((a) => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-bold text-sm">
                          {a.worker.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{a.worker.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {ROLE_LABELS[a.role] ?? a.role} · {a.worker.trade}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">From {formatDate(a.start_date)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {a.worker.wah_certified && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          a.wah_cert_expired ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"
                        }`}>
                          WAH {a.wah_cert_expired ? "EXPIRED" : "✓"}
                        </span>
                      )}
                      <button
                        onClick={() => handleEndAssignment(a.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        End
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive */}
        {assignments.filter((a) => a.status !== "ACTIVE").length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Past Assignments
            </h3>
            <div className="space-y-2">
              {assignments.filter((a) => a.status !== "ACTIVE").map((a) => (
                <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="font-medium text-sm text-gray-700">{a.worker.name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[a.role] ?? a.role}</p>
                  </div>
                  <StatusBadge status={a.status.toLowerCase()} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assign bottom sheet */}
      {showAssignSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Assign Worker</h3>
              <button onClick={() => { setShowAssignSheet(false); setFormError(""); }}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Worker *</label>
                <select
                  value={form.worker_id}
                  onChange={(e) => setForm({ ...form, worker_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select worker…</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.trade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {WORKER_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => setForm({ ...form, role })}
                      className={`min-h-[48px] border-2 rounded-xl text-sm font-medium transition-all ${
                        form.role === role
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-gray-200 text-gray-700"
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date *</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleAssign}
                disabled={submitting}
                className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Assigning…" : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
