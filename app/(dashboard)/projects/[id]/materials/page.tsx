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
import { MATERIAL_CATEGORIES, PAINT_BRANDS, formatDate } from "@/lib/utils";
import { ArrowLeft, Plus, Package, CheckCircle2, XCircle } from "lucide-react";

interface Material {
  id: number; material_category: string; brand: string; product_name: string;
  colour_code: string; colour_name: string; tc_colour_ref: string;
  estimated_qty: number; qty_unit: string; application_area: string;
  status: string; submitted_at: string; approved_at: string; rejection_reason: string;
}

const APP_AREAS = [
  { value: "external_wall", label: "External Wall" },
  { value: "internal_wall", label: "Internal Wall" },
  { value: "ceiling", label: "Ceiling" },
  { value: "corridor", label: "Corridor" },
  { value: "void_deck", label: "Void Deck" },
  { value: "roof", label: "Roof" },
  { value: "others", label: "Others" },
];

export default function MaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [actionMat, setActionMat] = useState<{ mat: Material; action: "approve" | "reject" | "submit" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rejReason, setRejReason] = useState("");
  const [form, setForm] = useState({
    material_category: "finishing_paint", brand: "Jotun", product_name: "",
    product_code: "", colour_code: "", colour_name: "", tc_colour_ref: "",
    estimated_qty: "", qty_unit: "litre", application_area: "external_wall",
  });

  const { data, isLoading } = useSWR(
    `/projects/${id}/materials`,
    () => api.get<APIResponse<Material[]>>(`/projects/${id}/materials`)
  );
  const materials = data?.data || [];

  const canManage = ["super_admin", "company_admin", "project_manager"].includes(user?.role || "");
  const canApprove = ["super_admin", "company_admin", "consultant", "tc_officer"].includes(user?.role || "");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post(`/projects/${id}/materials`, { ...form, estimated_qty: parseFloat(form.estimated_qty) });
      mutate(`/projects/${id}/materials`);
      setShowAdd(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleAction = async () => {
    if (!actionMat) return;
    setSaving(true); setError("");
    try {
      const { mat, action } = actionMat;
      if (action === "submit") await api.post(`/projects/${id}/materials/${mat.id}/submit`);
      else if (action === "approve") await api.post(`/projects/${id}/materials/${mat.id}/approve`, {});
      else await api.post(`/projects/${id}/materials/${mat.id}/reject`, { rejection_reason: rejReason });
      mutate(`/projects/${id}/materials`);
      setActionMat(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Material Submittals"
        subtitle="Paint brands, repair materials — submit for TC/consultant approval"
        actions={
          <div className="flex items-center gap-2">
            {canManage && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Material</Button>}
            <Link href={`/projects/${id}`}><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {isLoading ? <PageLoader /> : materials.length === 0 ? (
          <EmptyState icon={<Package className="w-12 h-12" />} title="No materials submitted" description="Submit paint brands and repair materials for approval before use" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((mat) => (
              <Card key={mat.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <StatusBadge status={mat.status} className="mb-1.5" />
                      <h3 className="text-sm font-semibold text-gray-900">{mat.product_name}</h3>
                      <p className="text-xs text-blue-600 font-medium">{mat.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{MATERIAL_CATEGORIES.find((c) => c.value === mat.material_category)?.label}</p>
                      {mat.colour_code && (
                        <p className="text-xs text-gray-600 mt-1 font-mono">{mat.colour_code}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                    <div><span className="font-medium">Qty:</span> {mat.estimated_qty} {mat.qty_unit}</div>
                    {mat.application_area && <div><span className="font-medium">Area:</span> {mat.application_area.replace(/_/g, " ")}</div>}
                    {mat.colour_name && <div><span className="font-medium">Colour:</span> {mat.colour_name}</div>}
                    {mat.tc_colour_ref && <div><span className="font-medium">TC Ref:</span> {mat.tc_colour_ref}</div>}
                  </div>
                  {mat.rejection_reason && <p className="text-xs text-red-600 mb-2">{mat.rejection_reason}</p>}
                  <div className="flex items-center gap-2">
                    {mat.status === "draft" && canManage && (
                      <Button size="sm" variant="outline" onClick={() => setActionMat({ mat, action: "submit" })}>Submit</Button>
                    )}
                    {mat.status === "submitted" && canApprove && (
                      <>
                        <Button size="sm" onClick={() => { setActionMat({ mat, action: "approve" }); setRejReason(""); }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => { setActionMat({ mat, action: "reject" }); setRejReason(""); }}>
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

      {/* Add Material Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Material Submittal" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Category *" value={form.material_category} onChange={(e) => setForm((f) => ({ ...f, material_category: e.target.value }))}>
              {MATERIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Select label="Brand *" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}>
              {PAINT_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <Input label="Product Name *" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} required placeholder="e.g. Jotashield Extreme" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Product Code" value={form.product_code} onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))} />
            <Input label="Colour Code" value={form.colour_code} onChange={(e) => setForm((f) => ({ ...f, colour_code: e.target.value }))} placeholder="e.g. TC3-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Colour Name" value={form.colour_name} onChange={(e) => setForm((f) => ({ ...f, colour_name: e.target.value }))} placeholder="e.g. Pale Yellow" />
            <Input label="TC Colour Reference" value={form.tc_colour_ref} onChange={(e) => setForm((f) => ({ ...f, tc_colour_ref: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Estimated Qty *" type="number" step="0.1" value={form.estimated_qty} onChange={(e) => setForm((f) => ({ ...f, estimated_qty: e.target.value }))} required />
            <Select label="Unit" value={form.qty_unit} onChange={(e) => setForm((f) => ({ ...f, qty_unit: e.target.value }))}>
              <option value="litre">Litre</option>
              <option value="kg">kg</option>
              <option value="bag">Bag</option>
              <option value="tin">Tin</option>
              <option value="m2">m²</option>
            </Select>
            <Select label="Application Area" value={form.application_area} onChange={(e) => setForm((f) => ({ ...f, application_area: e.target.value }))} className="col-span-2 sm:col-span-1">
              {APP_AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </div>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Material</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Approve/Reject */}
      <Modal open={actionMat !== null} onClose={() => setActionMat(null)} title={actionMat?.action === "approve" ? "Approve Material" : actionMat?.action === "reject" ? "Reject Material" : "Submit Material"} size="sm">
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <p className="text-sm text-gray-700">{actionMat?.mat.brand} — {actionMat?.mat.product_name}</p>
          {actionMat?.action === "reject" && (
            <Textarea label="Rejection Reason *" value={rejReason} onChange={(e) => setRejReason(e.target.value)} rows={2} required />
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setActionMat(null)}>Cancel</Button>
            <Button variant={actionMat?.action === "reject" ? "danger" : "primary"} onClick={handleAction} loading={saving}>
              {actionMat?.action === "approve" ? "Approve" : actionMat?.action === "reject" ? "Reject" : "Submit"}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
