"use client";
import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { formatDateTime, DEFECT_TYPES } from "@/lib/utils";
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Defect {
  id: number; defect_no: string; location_zone: string; defect_type: string;
  severity: string; description: string; status: string; raised_at: string;
  assigned_to_id: number | null; target_rectify_date: string;
}

export default function DefectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ location_zone: "", defect_type: "peeling_paint", severity: "medium", description: "", target_rectify_date: "" });

  const params_ = new URLSearchParams();
  if (statusFilter) params_.set("status", statusFilter);
  if (severityFilter) params_.set("severity", severityFilter);

  const { data, isLoading } = useSWR(
    `/projects/${id}/defects?${params_}`,
    () => api.get<APIResponse<Defect[]>>(`/projects/${id}/defects?${params_}`)
  );
  const defects = data?.data || [];

  const canRaise = ["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer", "consultant", "tc_officer"].includes(user?.role || "");
  const canVerify = ["super_admin", "company_admin", "project_manager", "consultant", "tc_officer", "safety_officer"].includes(user?.role || "");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post(`/projects/${id}/defects`, form);
      mutate(`/projects/${id}/defects?${params_}`);
      setShowAdd(false);
      setForm({ location_zone: "", defect_type: "peeling_paint", severity: "medium", description: "", target_rectify_date: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleRectify = async (defectId: number) => {
    try { await api.post(`/projects/${id}/defects/${defectId}/rectify`); mutate(`/projects/${id}/defects?${params_}`); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleVerify = async (defectId: number) => {
    try { await api.post(`/projects/${id}/defects/${defectId}/verify`, {}); mutate(`/projects/${id}/defects?${params_}`); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const severityColors: Record<string, string> = {
    high: "bg-red-50 border-l-4 border-red-500",
    medium: "bg-yellow-50 border-l-4 border-yellow-400",
    low: "bg-green-50 border-l-4 border-green-400",
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Defects"
        subtitle={`${defects.filter((d) => d.status === "open").length} open · ${defects.length} total`}
        actions={
          <div className="flex items-center gap-2">
            {canRaise && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Raise Defect</Button>}
            <Link href={`/projects/${id}`}><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="rectified">Rectified</option>
            <option value="verified_ok">Verified OK</option>
          </Select>
          <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full sm:w-36">
            <option value="">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>

        {isLoading ? <PageLoader /> : defects.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="w-12 h-12" />} title="No defects found" />
        ) : (
          <div className="space-y-3">
            {defects.map((defect) => (
              <Card key={defect.id} className={`overflow-hidden ${severityColors[defect.severity] || ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs text-gray-400">{defect.defect_no}</span>
                        <StatusBadge status={defect.severity} />
                        <StatusBadge status={defect.status} />
                        <span className="text-xs text-gray-500">
                          {DEFECT_TYPES.find((t) => t.value === defect.defect_type)?.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{defect.location_zone}</p>
                      {defect.description && <p className="text-xs text-gray-500 mt-0.5">{defect.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Raised {formatDateTime(defect.raised_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {defect.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => handleRectify(defect.id)}>Rectify</Button>
                      )}
                      {defect.status === "rectified" && canVerify && (
                        <Button size="sm" onClick={() => handleVerify(defect.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Raise Defect" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input label="Location / Zone *" placeholder="e.g. Blk 123 Level 5 North Wall" value={form.location_zone} onChange={(e) => setForm((f) => ({ ...f, location_zone: e.target.value }))} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Defect Type *" value={form.defect_type} onChange={(e) => setForm((f) => ({ ...f, defect_type: e.target.value }))}>
              {DEFECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Select label="Severity *" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Describe the defect in detail..." />
          <Input label="Target Rectification Date" type="date" value={form.target_rectify_date} onChange={(e) => setForm((f) => ({ ...f, target_rectify_date: e.target.value }))} />
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Raise Defect</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
