"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit2, X, CheckCircle2, ShieldCheck, ShieldX } from "lucide-react";

interface Worker {
  id: number;
  name: string;
  trade: string;
  nationality: string | null;
  fin_no: string | null;
  work_permit_no: string | null;
  contact_phone: string | null;
  wah_certified: boolean;
  wah_cert_expiry: string | null;
  is_active: boolean;
  created_at: string;
}

const TRADES = [
  { value: "painter", label: "Painter" },
  { value: "plasterer", label: "Plasterer" },
  { value: "waterproofer", label: "Waterproofer" },
  { value: "scaffolder", label: "Scaffolder" },
  { value: "general_worker", label: "General Worker" },
  { value: "supervisor", label: "Supervisor" },
  { value: "others", label: "Others" },
];

const NATIONALITIES = [
  "Singapore Citizen", "Singapore PR", "Malaysian", "Bangladeshi",
  "Indian", "Myanmar", "Chinese (PRC)", "Sri Lankan", "Filipino",
  "Thai", "Indonesian", "Others",
];

export default function WorkerDetailPage() {
  const { workerId } = useParams<{ workerId: string }>();
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState<Partial<Worker> & { wah_cert_expiry: string }>({
    wah_cert_expiry: "",
  });

  const { data, isLoading, mutate } = useSWR<APIResponse<Worker>>(
    `/workers/${workerId}`,
    () => api.get<APIResponse<Worker>>(`/workers/${workerId}`)
  );

  if (isLoading) return <PageLoader />;
  if (!data?.data) return <ErrorBanner message="Worker not found" />;

  const worker = data.data;

  const wahExpired = worker.wah_certified && worker.wah_cert_expiry
    ? new Date(worker.wah_cert_expiry) < new Date()
    : false;

  const openEdit = () => {
    setEditForm({
      name: worker.name,
      trade: worker.trade,
      nationality: worker.nationality ?? "",
      fin_no: worker.fin_no ?? "",
      work_permit_no: worker.work_permit_no ?? "",
      contact_phone: worker.contact_phone ?? "",
      wah_certified: worker.wah_certified,
      wah_cert_expiry: worker.wah_cert_expiry
        ? new Date(worker.wah_cert_expiry).toISOString().split("T")[0]
        : "",
    });
    setError("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    setError("");
    if (!editForm.name?.trim()) { setError("Name is required"); return; }
    setSubmitting(true);
    try {
      await api.patch(`/workers/${workerId}`, {
        name: editForm.name?.trim(),
        trade: editForm.trade,
        nationality: editForm.nationality || null,
        fin_no: editForm.fin_no?.trim() || null,
        work_permit_no: editForm.work_permit_no?.trim() || null,
        contact_phone: editForm.contact_phone?.trim() || null,
        wah_certified: editForm.wah_certified,
        wah_cert_expiry: editForm.wah_certified && editForm.wah_cert_expiry
          ? editForm.wah_cert_expiry
          : null,
      });
      setShowEdit(false);
      setFlash("Worker updated");
      setTimeout(() => setFlash(""), 2000);
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {flash && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white pointer-events-none">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">{flash}</p>
        </div>
      )}

      <Header
        title={worker.name}
        subtitle={TRADES.find((t) => t.value === worker.trade)?.label ?? worker.trade}
        actions={
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Status */}
        {!worker.is_active && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 font-medium text-center">
            This worker is inactive
          </div>
        )}

        {/* WAH status */}
        {worker.wah_certified && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
            wahExpired ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          }`}>
            {wahExpired
              ? <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0" />
              : <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${wahExpired ? "text-red-700" : "text-green-700"}`}>
                WAH Certified — {wahExpired ? "EXPIRED" : "Valid"}
              </p>
              {worker.wah_cert_expiry && (
                <p className="text-xs text-gray-500">Expires {formatDate(worker.wah_cert_expiry)}</p>
              )}
            </div>
          </div>
        )}

        {/* Details card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {[
            { label: "Trade", value: TRADES.find((t) => t.value === worker.trade)?.label ?? worker.trade },
            { label: "Nationality", value: worker.nationality },
            { label: "FIN / Work Permit No.", value: worker.fin_no },
            { label: "Work Permit No.", value: worker.work_permit_no },
            { label: "Contact Phone", value: worker.contact_phone },
            { label: "Registered", value: formatDate(worker.created_at) },
          ].map(({ label, value }) =>
            value ? (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Edit bottom sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit Worker</h3>
              <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {error && <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Trade *</label>
                  <select
                    value={editForm.trade ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  >
                    {TRADES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nationality</label>
                  <select
                    value={editForm.nationality ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  >
                    <option value="">— Select —</option>
                    {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">FIN No.</label>
                  <input
                    value={editForm.fin_no ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, fin_no: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    placeholder="e.g. G1234567P"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Phone</label>
                  <input
                    value={editForm.contact_phone ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    placeholder="e.g. 9123 4567"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  id="wah_edit"
                  checked={editForm.wah_certified ?? false}
                  onChange={(e) => setEditForm({ ...editForm, wah_certified: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="wah_edit" className="text-sm font-medium text-gray-700">WAH Certified</label>
              </div>

              {editForm.wah_certified && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">WAH Cert Expiry</label>
                  <input
                    type="date"
                    value={editForm.wah_cert_expiry ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, wah_cert_expiry: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  />
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
