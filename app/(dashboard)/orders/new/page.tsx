"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react";

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  qty_available: number;
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
}

type OrderLine = {
  inventory_item_id: string;
  qty_ordered: string;
  unit_price: string;
  description: string;
};

const STEPS = ["Order Details", "Add Materials", "Confirm & Place"];

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    supplier_contact: "",
    project_id: "",
    expected_delivery: "",
    notes: "",
  });

  const [lines, setLines] = useState<OrderLine[]>([
    { inventory_item_id: "", qty_ordered: "", unit_price: "", description: "" },
  ]);

  const { data: suppliersData } = useSWR<APIResponse<Supplier[]>>(
    "/suppliers",
    () => api.get<APIResponse<Supplier[]>>("/suppliers")
  );

  const { data: inventoryData } = useSWR<{ data: InventoryItem[] }>(
    "/inventory?limit=200",
    () => api.get<{ data: InventoryItem[] }>("/inventory?limit=200")
  );

  const { data: projectsData } = useSWR<{ data: Array<{ id: number; name: string }> }>(
    "/projects?limit=100",
    () => api.get<{ data: Array<{ id: number; name: string }> }>("/projects?limit=100")
  );

  const suppliers = (suppliersData?.data as unknown as Supplier[]) ?? [];
  const items = (inventoryData?.data as unknown as InventoryItem[]) ?? [];
  const projects = (projectsData?.data as unknown as Array<{ id: number; name: string }>) ?? [];

  const handleSupplierChange = (supplierId: string) => {
    const s = suppliers.find((s) => String(s.id) === supplierId);
    setForm({
      ...form,
      supplier_id: supplierId,
      supplier_name: s?.name ?? "",
      supplier_contact: s?.contact_person ?? "",
    });
  };

  const addLine = () =>
    setLines([...lines, { inventory_item_id: "", qty_ordered: "", unit_price: "", description: "" }]);

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: keyof OrderLine, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    setLines(updated);
  };

  const totalValue = lines.reduce((sum, l) => {
    const qty = parseFloat(l.qty_ordered) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async () => {
    setError("");
    const validLines = lines.filter((l) => l.inventory_item_id && l.qty_ordered);
    if (!form.supplier_name) { setError("Supplier name is required"); return; }
    if (!form.expected_delivery) { setError("Expected delivery date is required"); return; }
    if (validLines.length === 0) { setError("At least one order line is required"); return; }

    setSubmitting(true);
    try {
      const res = await api.post<APIResponse<{ id: number }>>("/orders", {
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : undefined,
        supplier_name: form.supplier_name,
        supplier_contact: form.supplier_contact || undefined,
        project_id: form.project_id ? parseInt(form.project_id) : undefined,
        expected_delivery: form.expected_delivery,
        notes: form.notes || undefined,
        lines: validLines.map((l) => ({
          inventory_item_id: parseInt(l.inventory_item_id),
          qty_ordered: parseFloat(l.qty_ordered),
          unit_price: parseFloat(l.unit_price) || undefined,
          description: l.description || undefined,
        })),
      });

      setShowSuccess(true);
      setTimeout(() => router.push(`/orders/${res.data.id}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {showSuccess && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">Order Placed!</p>
        </div>
      )}

      <Header
        title="New Purchase Order"
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i === step ? "bg-blue-600 text-white" :
                i < step ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "font-semibold text-blue-600" : "text-gray-400"}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Step 1: Order Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
              >
                <option value="">Select existing supplier or type below</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier Name *</label>
              <input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                placeholder="Supplier name"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Contact</label>
              <input
                value={form.supplier_contact}
                onChange={(e) => setForm({ ...form, supplier_contact: e.target.value })}
                placeholder="Contact person / phone"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Project (optional)</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
              >
                <option value="">Not project-specific</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Expected Delivery *</label>
              <input
                type="date"
                value={form.expected_delivery}
                onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
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
          </div>
        )}

        {/* Step 2: Add Materials */}
        {step === 1 && (
          <div className="space-y-4">
            {lines.map((line, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Line {i + 1}</span>
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <select
                  value={line.inventory_item_id}
                  onChange={(e) => updateLine(i, "inventory_item_id", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                >
                  <option value="">Select material…</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Qty *</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={line.qty_ordered}
                      onChange={(e) => updateLine(i, "qty_ordered", e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Unit Price ($)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={line.unit_price}
                      onChange={(e) => updateLine(i, "unit_price", e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addLine}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              <Plus className="w-4 h-4" /> Add Another Item
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span className="font-medium">{form.supplier_name}</span></div>
              {form.supplier_contact && <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{form.supplier_contact}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Expected Delivery</span><span className="font-medium">{form.expected_delivery}</span></div>
              {totalValue > 0 && <div className="flex justify-between"><span className="text-gray-500">Est. Total</span><span className="font-bold text-gray-900">${totalValue.toLocaleString()}</span></div>}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
                {lines.filter((l) => l.inventory_item_id).length} line item(s)
              </div>
              <div className="divide-y divide-gray-50">
                {lines.filter((l) => l.inventory_item_id).map((line, i) => {
                  const item = items.find((it) => String(it.id) === line.inventory_item_id);
                  return (
                    <div key={i} className="px-4 py-3 flex justify-between text-sm">
                      <span className="text-gray-800">{item?.name ?? "Item"}</span>
                      <span className="text-gray-500">{line.qty_ordered} {item?.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 min-h-[52px] border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 min-h-[52px] bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Placing Order…" : "Place Order"}
          </button>
        )}
      </div>
    </div>
  );
}
