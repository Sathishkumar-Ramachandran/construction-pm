"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { Plus, Truck, Phone, Mail, MapPin } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canManage = ["super_admin", "company_admin", "project_manager"].includes(user?.role || "");

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", contact_person: "", phone: "", email: "", address: "", notes: "",
  });

  const { data, isLoading } = useSWR(
    "/suppliers",
    () => api.get<APIResponse<Supplier[]>>("/suppliers")
  );
  const suppliers = data?.data ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Supplier name is required"); return; }
    setSaving(true); setError("");
    try {
      await api.post("/suppliers", {
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
      });
      mutate("/suppliers");
      setShowAdd(false);
      setForm({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Suppliers"
        subtitle={`${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""}`}
        actions={
          canManage && (
            <Button size="sm" onClick={() => { setError(""); setShowAdd(true); }}>
              <Plus className="w-4 h-4" /> Add Supplier
            </Button>
          )
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        {isLoading ? (
          <PageLoader />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-12 h-12" />}
            title="No suppliers yet"
            description="Add suppliers to use when creating purchase orders"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/suppliers/${s.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h3>
                      {s.contact_person && (
                        <p className="text-xs text-gray-500 mt-0.5">{s.contact_person}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {s.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {s.phone}
                      </p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {s.email}
                      </p>
                    )}
                    {s.address && (
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {s.address}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input
            label="Supplier Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Hup Cheong Hardware"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              value={form.contact_person}
              onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
              placeholder="e.g. John Tan"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. 6123 4567"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="e.g. sales@supplier.com"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="e.g. 10 Jurong East Street 12"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes"
          />
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Supplier</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
