"use client";
import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate, PERMIT_TYPES } from "@/lib/utils";
import { ArrowLeft, Plus, Shield, CheckCircle2, XCircle, Upload } from "lucide-react";

interface Permit {
  id: number; permit_type: string; title: string; reference_no: string;
  issuing_authority: string; status: string; applied_date: string;
  approved_date: string; expiry_date: string; rejection_reason: string; notes: string;
}

export default function PermitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [actionPermit, setActionPermit] = useState<{ permit: Permit; action: "approve" | "reject" | "submit" } | null>(null);
  const [form, setForm] = useState({ permit_type: "tc_approval", title: "", issuing_authority: "", applied_date: "", expiry_date: "", notes: "" });
  const [actionForm, setActionForm] = useState({ approved_date: "", expiry_date: "", rejection_reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useSWR(
    `/projects/${id}/permits`,
    () => api.get<APIResponse<Permit[]>>(`/projects/${id}/permits`)
  );
  const permits = data?.data || [];

  const canManage = ["super_admin", "company_admin", "project_manager", "safety_officer"].includes(user?.role || "");
  const canApprove = ["super_admin", "company_admin", "consultant", "tc_officer"].includes(user?.role || "");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post(`/projects/${id}/permits`, form);
      mutate(`/projects/${id}/permits`);
      setShowAdd(false);
      setForm({ permit_type: "tc_approval", title: "", issuing_authority: "", applied_date: "", expiry_date: "", notes: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to add permit"); }
    finally { setSaving(false); }
  };

  const handleAction = async () => {
    if (!actionPermit) return;
    setSaving(true); setError("");
    try {
      const { permit, action } = actionPermit;
      if (action === "submit") await api.post(`/projects/${id}/permits/${permit.id}/submit`);
      else if (action === "approve") await api.post(`/projects/${id}/permits/${permit.id}/approve`, actionForm);
      else await api.post(`/projects/${id}/permits/${permit.id}/reject`, actionForm);
      mutate(`/projects/${id}/permits`);
      setActionPermit(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Permits & Approvals"
        subtitle="Track all required permits for this project"
        actions={
          <div className="flex items-center gap-2">
            {canManage && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Permit</Button>}
            <Link href={`/projects/${id}`}><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {isLoading ? <PageLoader /> : permits.length === 0 ? (
          <EmptyState icon={<Shield className="w-12 h-12" />} title="No permits added" description="Add required permits and track their approval status" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permits.map((permit) => (
              <Card key={permit.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <StatusBadge status={permit.status} className="mb-1.5" />
                      <h3 className="text-sm font-semibold text-gray-900">{permit.title}</h3>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {PERMIT_TYPES.find((t) => t.value === permit.permit_type)?.label || permit.permit_type}
                    </span>
                  </div>
                  {permit.issuing_authority && <p className="text-xs text-gray-400 mb-2">{permit.issuing_authority}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    {permit.reference_no && <div><span className="font-medium">Ref:</span> {permit.reference_no}</div>}
                    {permit.applied_date && <div><span className="font-medium">Applied:</span> {formatDate(permit.applied_date)}</div>}
                    {permit.approved_date && <div><span className="font-medium">Approved:</span> {formatDate(permit.approved_date)}</div>}
                    {permit.expiry_date && <div><span className="font-medium">Expires:</span> {formatDate(permit.expiry_date)}</div>}
                  </div>
                  {permit.rejection_reason && <p className="text-xs text-red-600 mb-2">{permit.rejection_reason}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    {permit.status === "draft" && canManage && (
                      <Button size="sm" variant="outline" onClick={() => setActionPermit({ permit, action: "submit" })}>Submit</Button>
                    )}
                    {permit.status === "submitted" && canApprove && (
                      <>
                        <Button size="sm" onClick={() => { setActionPermit({ permit, action: "approve" }); setActionForm({ approved_date: "", expiry_date: "", rejection_reason: "" }); }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => { setActionPermit({ permit, action: "reject" }); setActionForm({ approved_date: "", expiry_date: "", rejection_reason: "" }); }}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Permit Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Permit" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Select label="Permit Type *" value={form.permit_type} onChange={(e) => setForm((f) => ({ ...f, permit_type: e.target.value }))}>
            {PERMIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Works Approval — Blk 123" />
          <Input label="Issuing Authority" value={form.issuing_authority} onChange={(e) => setForm((f) => ({ ...f, issuing_authority: e.target.value }))} placeholder="e.g. Ang Mo Kio Town Council" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Applied Date" type="date" value={form.applied_date} onChange={(e) => setForm((f) => ({ ...f, applied_date: e.target.value }))} />
            <Input label="Expiry Date" type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Permit</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        open={actionPermit !== null}
        onClose={() => setActionPermit(null)}
        title={actionPermit?.action === "approve" ? "Approve Permit" : actionPermit?.action === "reject" ? "Reject Permit" : "Submit Permit"}
        size="sm"
      >
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <p className="text-sm text-gray-600">{actionPermit?.permit.title}</p>
          {actionPermit?.action === "approve" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Approved Date" type="date" value={actionForm.approved_date} onChange={(e) => setActionForm((f) => ({ ...f, approved_date: e.target.value }))} />
              <Input label="Expiry Date" type="date" value={actionForm.expiry_date} onChange={(e) => setActionForm((f) => ({ ...f, expiry_date: e.target.value }))} />
            </div>
          )}
          {actionPermit?.action === "reject" && (
            <Textarea label="Rejection Reason *" value={actionForm.rejection_reason} onChange={(e) => setActionForm((f) => ({ ...f, rejection_reason: e.target.value }))} required rows={3} />
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setActionPermit(null)}>Cancel</Button>
            <Button
              variant={actionPermit?.action === "reject" ? "danger" : "primary"}
              onClick={handleAction}
              loading={saving}
            >
              {actionPermit?.action === "approve" ? "Approve" : actionPermit?.action === "reject" ? "Reject" : "Submit"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
