"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { ArrowLeft, Plus, X, CheckCircle2 } from "lucide-react";

interface ProjectInventoryItem {
  id: number;
  qty_allocated: number;
  qty_used: number;
  qty_returned: number;
  inventory_item: {
    id: number;
    code: string;
    name: string;
    unit: string;
    qty_available: number;
  };
}

interface InventoryListItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  qty_available: number;
  category: string;
}

export default function ProjectInventoryPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [showAllocate, setShowAllocate] = useState(false);
  const [form, setForm] = useState({ inventory_item_id: "", qty: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [flashMsg, setFlashMsg] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, mutate } = useSWR<APIResponse<ProjectInventoryItem[]>>(
    `/projects/${projectId}/inventory`,
    () => api.get<APIResponse<ProjectInventoryItem[]>>(`/projects/${projectId}/inventory`)
  );

  const { data: inventoryData } = useSWR<APIResponse<InventoryListItem[]>>(
    "/inventory?limit=200",
    () => api.get<APIResponse<InventoryListItem[]>>("/inventory?limit=200")
  );

  const allocations = data?.data ?? [];
  const inventoryList = (inventoryData?.data ?? []) as InventoryListItem[];

  const handleAllocate = async () => {
    setError("");
    if (!form.inventory_item_id) { setError("Select an inventory item"); return; }
    const qty = parseFloat(form.qty);
    if (!qty || qty <= 0) { setError("Enter a valid quantity"); return; }

    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/inventory`, {
        inventory_item_id: parseInt(form.inventory_item_id),
        qty_allocated: qty,
        notes: form.notes || undefined,
      });
      setShowAllocate(false);
      setForm({ inventory_item_id: "", qty: "", notes: "" });
      setFlashMsg("Stock allocated");
      setTimeout(() => setFlashMsg(""), 2000);
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Allocation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUse = async (piId: number, maxQty: number) => {
    const qtyStr = prompt(`Record usage (max ${maxQty}):`);
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > maxQty) {
      alert("Invalid quantity");
      return;
    }
    try {
      await api.post(`/projects/${projectId}/inventory/${piId}/use`, { qty_used: qty });
      setFlashMsg("Usage recorded");
      setTimeout(() => setFlashMsg(""), 2000);
      mutate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to record usage");
    }
  };

  const handleReturn = async (piId: number, maxReturn: number) => {
    const qtyStr = prompt(`Return quantity (max ${maxReturn}):`);
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > maxReturn) {
      alert("Invalid quantity");
      return;
    }
    try {
      await api.post(`/projects/${projectId}/inventory/${piId}/return`, { qty_returned: qty });
      setFlashMsg("Stock returned");
      setTimeout(() => setFlashMsg(""), 2000);
      mutate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to return stock");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {flashMsg && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white pointer-events-none">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">{flashMsg}</p>
        </div>
      )}

      <Header
        title="Project Inventory"
        subtitle={`Project ${projectId}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => { setError(""); setShowAllocate(true); }}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Allocate
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {isLoading && <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-blue-600" /></div>}

        {!isLoading && allocations.length === 0 && (
          <EmptyState
            title="No materials allocated"
            description="Allocate inventory items to track material usage on this project"
          />
        )}

        {allocations.map((pi) => {
          const remaining = Number(pi.qty_allocated) - Number(pi.qty_used) - Number(pi.qty_returned);
          const usedPct = Number(pi.qty_allocated) > 0
            ? Math.round((Number(pi.qty_used) / Number(pi.qty_allocated)) * 100)
            : 0;

          return (
            <div key={pi.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{pi.inventory_item.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{pi.inventory_item.code}</p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono flex-shrink-0">
                  {pi.inventory_item.unit}
                </span>
              </div>

              {/* Usage bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full ${usedPct >= 90 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-500" : "bg-blue-500"}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="text-center">
                  <p className="font-medium text-gray-900">{Number(pi.qty_allocated).toFixed(1)}</p>
                  <p className="text-gray-500">Allocated</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-amber-600">{Number(pi.qty_used).toFixed(1)}</p>
                  <p className="text-gray-500">Used</p>
                </div>
                <div className="text-center">
                  <p className={`font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                    {remaining.toFixed(1)}
                  </p>
                  <p className="text-gray-500">Remaining</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUse(pi.id, remaining)}
                  disabled={remaining <= 0}
                  className="flex-1 min-h-[40px] bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-40"
                >
                  Record Use
                </button>
                <button
                  onClick={() => handleReturn(pi.id, remaining)}
                  disabled={remaining <= 0}
                  className="flex-1 min-h-[40px] bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40"
                >
                  Return
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Allocate bottom sheet */}
      {showAllocate && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Allocate Material</h3>
              <button onClick={() => setShowAllocate(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {error && <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Item *</label>
                <select
                  value={form.inventory_item_id}
                  onChange={(e) => setForm({ ...form, inventory_item_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                >
                  <option value="">Select material…</option>
                  {inventoryList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name} ({Number(item.qty_available).toFixed(1)} {item.unit} available)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAllocate}
                disabled={submitting}
                className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Allocating…" : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
