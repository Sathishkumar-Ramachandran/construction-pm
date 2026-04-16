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
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Plus, FileText, CheckCircle2, XCircle, Upload } from "lucide-react";

interface Document {
  id: number; doc_type: string; title: string; version: string;
  status: string; file_name: string; submitted_at: string; approved_at: string; remarks: string; rejection_reason: string;
}

const DOC_TYPES = [
  { value: "method_statement", label: "Method Statement" },
  { value: "risk_assessment", label: "Risk Assessment (RA)" },
  { value: "safe_work_procedure", label: "Safe Work Procedure (SWP)" },
  { value: "site_inspection_report", label: "Site Inspection Report" },
  { value: "toolbox_meeting_record", label: "Toolbox Meeting Record" },
  { value: "daily_report", label: "Daily Report" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "defect_report", label: "Defect Report" },
  { value: "completion_report", label: "Completion Report" },
  { value: "others", label: "Others" },
];

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [actionDoc, setActionDoc] = useState<{ doc: Document; action: "approve" | "reject" | "submit" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejReason, setRejReason] = useState("");
  const [form, setForm] = useState({ doc_type: "method_statement", title: "", version: "v1.0", remarks: "" });

  const { data, isLoading } = useSWR(
    `/projects/${id}/documents`,
    () => api.get<APIResponse<Document[]>>(`/projects/${id}/documents`)
  );
  const documents = data?.data || [];

  const canManage = ["super_admin", "company_admin", "project_manager", "safety_officer"].includes(user?.role || "");
  const canApprove = ["super_admin", "company_admin", "consultant", "tc_officer"].includes(user?.role || "");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post(`/projects/${id}/documents`, form);
      mutate(`/projects/${id}/documents`);
      setShowAdd(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleAction = async () => {
    if (!actionDoc) return;
    setSaving(true); setError("");
    try {
      const { doc, action } = actionDoc;
      if (action === "submit") await api.post(`/projects/${id}/documents/${doc.id}/submit`);
      else if (action === "approve") await api.post(`/projects/${id}/documents/${doc.id}/approve`, { remarks: "" });
      else await api.post(`/projects/${id}/documents/${doc.id}/reject`, { rejection_reason: rejReason });
      mutate(`/projects/${id}/documents`);
      setActionDoc(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const docTypeLabel = (type: string) => DOC_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Documents"
        subtitle="Method statements, RA, SWP — submit for approval"
        actions={
          <div className="flex items-center gap-2">
            {canManage && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Document</Button>}
            <Link href={`/projects/${id}`}><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {isLoading ? <PageLoader /> : documents.length === 0 ? (
          <EmptyState icon={<FileText className="w-12 h-12" />} title="No documents added" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={doc.status} />
                        <span className="text-xs text-gray-400">{doc.version}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{doc.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{docTypeLabel(doc.doc_type)}</p>
                    </div>
                    <FileText className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
                  </div>
                  {doc.file_name && (
                    <p className="text-xs text-blue-600 mb-2 truncate">{doc.file_name}</p>
                  )}
                  {doc.rejection_reason && <p className="text-xs text-red-600 mb-2">{doc.rejection_reason}</p>}
                  {doc.remarks && <p className="text-xs text-gray-400 italic mb-2">{doc.remarks}</p>}
                  <div className="flex items-center gap-2">
                    {doc.status === "draft" && canManage && (
                      <Button size="sm" variant="outline" onClick={() => setActionDoc({ doc, action: "submit" })}>Submit</Button>
                    )}
                    {doc.status === "submitted" && canApprove && (
                      <>
                        <Button size="sm" onClick={() => { setActionDoc({ doc, action: "approve" }); setRejReason(""); }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => { setActionDoc({ doc, action: "reject" }); setRejReason(""); }}>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Document" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Select label="Document Type *" value={form.doc_type} onChange={(e) => setForm((f) => ({ ...f, doc_type: e.target.value }))}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Method Statement Rev 1" />
          <Input label="Version" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="v1.0" />
          <Textarea label="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} rows={2} />
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Document</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={actionDoc !== null} onClose={() => setActionDoc(null)} title={actionDoc?.action === "approve" ? "Approve Document" : actionDoc?.action === "reject" ? "Reject Document" : "Submit Document"} size="sm">
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <p className="text-sm text-gray-700">{actionDoc?.doc.title}</p>
          {actionDoc?.action === "reject" && (
            <Textarea label="Rejection Reason *" value={rejReason} onChange={(e) => setRejReason(e.target.value)} rows={2} required />
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setActionDoc(null)}>Cancel</Button>
            <Button variant={actionDoc?.action === "reject" ? "danger" : "primary"} onClick={handleAction} loading={saving}>
              {actionDoc?.action === "approve" ? "Approve" : actionDoc?.action === "reject" ? "Reject" : "Submit"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
