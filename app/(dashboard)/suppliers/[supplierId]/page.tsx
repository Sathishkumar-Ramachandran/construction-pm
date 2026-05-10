"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Edit2, X, CheckCircle2, Phone, Mail, MapPin, FileText } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

interface PurchaseOrderSummary {
  id: number;
  po_number: string;
  status: string;
  expected_delivery: string;
  total_value: number | null;
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  purchase_orders: PurchaseOrderSummary[];
}

export default function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const canManage = ["super_admin", "company_admin", "project_manager"].includes(user?.role || "");

  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "", contact_person: "", phone: "", email: "", address: "", notes: "",
  });

  const { data, isLoading, mutate } = useSWR<APIResponse<Supplier>>(
    `/suppliers/${supplierId}`,
    () => api.get<APIResponse<Supplier>>(`/suppliers/${supplierId}`)
  );

  if (isLoading) return <PageLoader />;
  if (!data?.data) return <ErrorBanner message="Supplier not found" />;

  const supplier = data.data;

  const openEdit = () => {
    setEditForm({
      name: supplier.name,
      contact_person: supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    setError("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) { setError("Supplier name is required"); return; }
    setSubmitting(true); setError("");
    try {
      await api.patch(`/suppliers/${supplierId}`, {
        name: editForm.name.trim(),
        contact_person: editForm.contact_person || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        address: editForm.address || null,
        notes: editForm.notes || null,
      });
      setShowEdit(false);
      setFlash("Supplier updated");
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
        title={supplier.name}
        subtitle={supplier.contact_person ?? "Supplier"}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
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
        {/* Contact details */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          {[
            { icon: Phone, value: supplier.phone },
            { icon: Mail, value: supplier.email },
            { icon: MapPin, value: supplier.address },
          ].map(({ icon: Icon, value }) =>
            value ? (
              <div key={value} className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{value}</span>
              </div>
            ) : null
          )}
          {supplier.notes && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-500">{supplier.notes}</p>
            </div>
          )}
          {!supplier.phone && !supplier.email && !supplier.address && !supplier.notes && (
            <p className="text-sm text-gray-400 text-center py-2">No contact details added</p>
          )}
        </div>

        {/* Recent orders */}
        {supplier.purchase_orders.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Orders</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {supplier.purchase_orders.map((po) => (
                <button
                  key={po.id}
                  onClick={() => router.push(`/orders/${po.id}`)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{po.po_number}</p>
                    <p className="text-xs text-gray-400">{formatDate(po.expected_delivery)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {po.total_value && (
                      <span className="text-sm text-gray-600">${Number(po.total_value).toLocaleString()}</span>
                    )}
                    <StatusBadge status={po.status.toLowerCase()} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit bottom sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit Supplier</h3>
              <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {error && <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier Name *</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact Person</label>
                  <input
                    value={editForm.contact_person}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    placeholder="6123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  placeholder="sales@supplier.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  placeholder="Any notes"
                />
              </div>

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
