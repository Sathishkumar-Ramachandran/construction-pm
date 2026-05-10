"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, Package, TrendingDown, TrendingUp, Edit2, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  unit_cost: number | null;
  qty_on_hand: number;
  qty_allocated: number;
  qty_available: number;
  reorder_level: number;
  is_low_stock: boolean;
  location: string | null;
  description: string | null;
  is_active: boolean;
  transactions: Array<{
    id: number;
    type: string;
    qty: number;
    qty_before: number;
    qty_after: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
    recorded_by: { full_name: string };
  }>;
}

const TRANSACTION_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE_RECEIPT:    { label: "Purchase Receipt",   color: "text-green-600" },
  PROJECT_ALLOCATION:  { label: "Project Allocation", color: "text-blue-600" },
  PROJECT_RETURN:      { label: "Project Return",     color: "text-teal-600" },
  USAGE_RECORD:        { label: "Usage",              color: "text-amber-600" },
  MANUAL_ADJUSTMENT:   { label: "Adjustment",         color: "text-purple-600" },
  WRITE_OFF:           { label: "Write-Off",          color: "text-red-600" },
  OPENING_STOCK:       { label: "Opening Stock",      color: "text-gray-600" },
};

const CAT_LABELS: Record<string, string> = {
  PRIMER: "Primer", SEALER: "Sealer", FINISHING_PAINT: "Finishing Paint",
  WEATHERCOAT: "Weathercoat", ELASTOMERIC: "Elastomeric", EMULSION: "Emulsion",
  FILLER: "Filler", SEALANT: "Sealant", PROTECTIVE_COATING: "Protective Coating",
  SCAFFOLD_MATERIAL: "Scaffold Material", SAFETY_EQUIPMENT: "Safety Equipment",
  TOOLS: "Tools", MISCELLANEOUS: "Miscellaneous",
};

export default function InventoryItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const [showAdjust, setShowAdjust] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ qty: "", type: "MANUAL_ADJUSTMENT", notes: "" });
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [flashMsg, setFlashMsg] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, mutate } = useSWR<APIResponse<InventoryItem>>(
    `/inventory/${itemId}`,
    () => api.get<APIResponse<InventoryItem>>(`/inventory/${itemId}`)
  );

  if (isLoading) return <PageLoader />;
  if (!data?.data) return <ErrorBanner message="Item not found" />;

  const item = data.data;

  const stockPct = item.qty_on_hand > 0
    ? Math.min(100, Math.round((item.qty_available / item.qty_on_hand) * 100))
    : 0;

  const handleAdjust = async () => {
    setError("");
    const qty = parseFloat(adjustForm.qty);
    if (isNaN(qty) || qty === 0) { setError("Enter a non-zero quantity"); return; }
    setSubmitting(true);
    try {
      await api.post(`/inventory/${itemId}/adjust`, {
        qty,
        type: adjustForm.type,
        notes: adjustForm.notes || undefined,
      });
      setShowAdjust(false);
      setAdjustForm({ qty: "", type: "MANUAL_ADJUSTMENT", notes: "" });
      setFlashMsg("Stock adjusted");
      setTimeout(() => setFlashMsg(""), 2000);
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.patch(`/inventory/${itemId}`, editForm);
      setShowEdit(false);
      setFlashMsg("Item updated");
      setTimeout(() => setFlashMsg(""), 2000);
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update item");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      name: item.name,
      brand: item.brand ?? undefined,
      unit_cost: item.unit_cost ?? undefined,
      reorder_level: item.reorder_level,
      location: item.location ?? undefined,
      description: item.description ?? undefined,
    });
    setShowEdit(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Flash */}
      {flashMsg && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white pointer-events-none">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">{flashMsg}</p>
        </div>
      )}

      <Header
        title={item.name}
        subtitle={item.code}
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
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-4 pb-28">
        {/* Low stock alert */}
        {item.is_low_stock && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Low stock — {item.qty_available} {item.unit} available (reorder at {item.reorder_level})
            </p>
          </div>
        )}

        {/* Stock overview */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  {CAT_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                  {item.unit}
                </span>
                {item.brand && (
                  <span className="text-xs text-gray-500">{item.brand}</span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              )}
              {item.location && (
                <p className="text-xs text-gray-400 mt-0.5">📍 {item.location}</p>
              )}
            </div>
            <Package className="w-8 h-8 text-gray-200" />
          </div>

          {/* Stock bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
            <div
              className={`h-3 rounded-full transition-all ${
                item.is_low_stock ? "bg-red-500" : stockPct < 40 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${stockPct}%` }}
            />
          </div>

          {/* Stock grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xl font-bold text-gray-900">{Number(item.qty_on_hand).toFixed(1)}</p>
              <p className="text-xs text-gray-500">On Hand</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xl font-bold text-blue-700">{Number(item.qty_allocated).toFixed(1)}</p>
              <p className="text-xs text-blue-600">Allocated</p>
            </div>
            <div className={`rounded-xl p-3 ${item.is_low_stock ? "bg-red-50" : "bg-green-50"}`}>
              <p className={`text-xl font-bold ${item.is_low_stock ? "text-red-700" : "text-green-700"}`}>
                {Number(item.qty_available).toFixed(1)}
              </p>
              <p className={`text-xs ${item.is_low_stock ? "text-red-600" : "text-green-600"}`}>Available</p>
            </div>
          </div>

          {item.unit_cost && (
            <p className="text-xs text-gray-500 mt-3 text-right">
              Unit cost: ${Number(item.unit_cost).toFixed(2)} |
              Stock value: ${(Number(item.qty_on_hand) * Number(item.unit_cost)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Transaction history */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Transaction History</h3>
          </div>
          {item.transactions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No transactions yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {item.transactions.map((tx) => {
                const meta = TRANSACTION_LABELS[tx.type] ?? { label: tx.type, color: "text-gray-600" };
                const isPositive = Number(tx.qty) > 0;
                return (
                  <div key={tx.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        </div>
                        {tx.reference && <p className="text-xs text-gray-500 mt-0.5">{tx.reference}</p>}
                        {tx.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{tx.notes}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tx.recorded_by.full_name} · {formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`flex items-center gap-1 font-semibold text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {isPositive ? "+" : ""}{Number(tx.qty).toFixed(1)}
                        </div>
                        <p className="text-xs text-gray-400">
                          {Number(tx.qty_before).toFixed(1)} → {Number(tx.qty_after).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky adjust button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => { setError(""); setShowAdjust(true); }}
          className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700"
        >
          Adjust Stock
        </button>
      </div>

      {/* Adjust bottom sheet */}
      {showAdjust && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Adjust Stock</h3>
              <button onClick={() => setShowAdjust(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {error && <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                >
                  <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                  <option value="WRITE_OFF">Write-Off</option>
                  <option value="OPENING_STOCK">Opening Stock</option>
                  <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Quantity (use negative to decrease)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={adjustForm.qty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, qty: e.target.value })}
                  placeholder="e.g. 10 or -5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Reason for adjustment"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAdjust}
                disabled={submitting}
                className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Confirm Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit bottom sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit Item</h3>
              <button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {error && <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                <input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Brand</label>
                <input
                  value={editForm.brand ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Unit Cost ($)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editForm.unit_cost ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, unit_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Reorder Level</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editForm.reorder_level ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, reorder_level: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
                <input
                  value={editForm.location ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={editForm.description ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleEdit}
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
