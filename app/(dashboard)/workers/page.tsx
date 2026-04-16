"use client";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { Plus, HardHat, Phone, ShieldCheck } from "lucide-react";

interface Worker {
  id: number; name: string; trade: string; contact_phone: string | null;
  fin_no: string | null; nationality: string | null;
  wah_certified: boolean; wah_cert_expiry: string | null; is_active: boolean;
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

export default function WorkersPage() {
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", trade: "painter", contact_phone: "",
    fin_no: "", nationality: "", wah_certified: false, wah_cert_expiry: "",
  });

  const canManage = ["super_admin", "company_admin", "project_manager"].includes(user?.role || "");
  const canDeactivate = ["super_admin", "company_admin"].includes(user?.role || "");

  const { data, isLoading } = useSWR(
    "/workers",
    () => api.get<APIResponse<Worker[]>>("/workers")
  );
  const workers = data?.data || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        wah_cert_expiry: form.wah_cert_expiry || null,
        fin_no: form.fin_no || null,
        nationality: form.nationality || null,
        contact_phone: form.contact_phone || null,
      };
      await api.post("/workers", payload);
      mutate("/workers");
      setShowAdd(false);
      setForm({ name: "", trade: "painter", contact_phone: "", fin_no: "", nationality: "", wah_certified: false, wah_cert_expiry: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Deactivate this worker?")) return;
    try {
      await api.patch(`/workers/${id}/deactivate`, {});
      mutate("/workers");
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Workers"
        subtitle={`${workers.filter((w) => w.is_active).length} active workers`}
        actions={
          canManage && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Worker
            </Button>
          )
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        {isLoading ? <PageLoader /> : workers.length === 0 ? (
          <EmptyState
            icon={<HardHat className="w-12 h-12" />}
            title="No workers added"
            description="Add workers to assign them to projects and toolbox meetings"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((w) => (
              <Card key={w.id} className={!w.is_active ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <HardHat className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {w.wah_certified && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> WAH
                        </span>
                      )}
                      {!w.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{w.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TRADES.find((t) => t.value === w.trade)?.label || w.trade}
                    {w.nationality && <span className="ml-1.5 text-gray-400">· {w.nationality}</span>}
                  </p>
                  {w.contact_phone && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                      <Phone className="w-3 h-3" /> {w.contact_phone}
                    </p>
                  )}
                  {w.wah_cert_expiry && (
                    <p className="text-xs text-gray-400 mt-0.5">WAH expires: {w.wah_cert_expiry}</p>
                  )}
                  {canDeactivate && w.is_active && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleDeactivate(w.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Worker" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. Ahmad Bin Salleh"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Trade *"
              value={form.trade}
              onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
            >
              {TRADES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              placeholder="e.g. Singaporean"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="FIN / Work Permit No."
              value={form.fin_no}
              onChange={(e) => setForm((f) => ({ ...f, fin_no: e.target.value }))}
              placeholder="e.g. G1234567P"
            />
            <Input
              label="Contact Phone"
              value={form.contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
              placeholder="e.g. 9123 4567"
            />
          </div>
          <div className="flex items-start gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.wah_certified}
                onChange={(e) => setForm((f) => ({ ...f, wah_certified: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">WAH Certified</span>
            </label>
            {form.wah_certified && (
              <div className="flex-1">
                <Input
                  label="WAH Cert Expiry"
                  type="date"
                  value={form.wah_cert_expiry}
                  onChange={(e) => setForm((f) => ({ ...f, wah_cert_expiry: e.target.value }))}
                />
              </div>
            )}
          </div>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Worker</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
