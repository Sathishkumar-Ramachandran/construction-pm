"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  "PRIMER", "SEALER", "FINISHING_PAINT", "WEATHERCOAT", "ELASTOMERIC",
  "EMULSION", "FILLER", "SEALANT", "PROTECTIVE_COATING",
  "SCAFFOLD_MATERIAL", "SAFETY_EQUIPMENT", "TOOLS", "MISCELLANEOUS",
];

const CAT_LABELS: Record<string, string> = {
  PRIMER: "Primer", SEALER: "Sealer", FINISHING_PAINT: "Finishing Paint",
  WEATHERCOAT: "Weathercoat", ELASTOMERIC: "Elastomeric", EMULSION: "Emulsion",
  FILLER: "Filler", SEALANT: "Sealant", PROTECTIVE_COATING: "Protective Coating",
  SCAFFOLD_MATERIAL: "Scaffold Material", SAFETY_EQUIPMENT: "Safety Equipment",
  TOOLS: "Tools", MISCELLANEOUS: "Miscellaneous",
};

const UNITS = ["LITRE", "KG", "BAG", "TIN", "ROLL", "PIECE", "SET", "M2", "M3", "BOX"];

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    brand: "",
    category: "PRIMER",
    unit: "LITRE",
    unit_cost: "",
    reorder_level: "",
    location: "",
    description: "",
  });

  const handleSubmit = async () => {
    setError("");
    if (!form.code.trim()) { setError("Item code is required"); return; }
    if (!form.name.trim()) { setError("Item name is required"); return; }

    setSubmitting(true);
    try {
      const res = await api.post<APIResponse<{ id: number }>>("/inventory", {
        code: form.code.trim(),
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        category: form.category,
        unit: form.unit,
        unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : undefined,
        reorder_level: form.reorder_level ? parseFloat(form.reorder_level) : 0,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => router.push(`/inventory/${res.data.id}`), 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {showSuccess && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">Item Created!</p>
        </div>
      )}

      <Header
        title="New Inventory Item"
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      <div className="flex-1 p-4 space-y-4 pb-28">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Code & Name */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Basic Info</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Item Code *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. PRN-001"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Nippon Paint Weatherbond"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="e.g. Nippon Paint"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Category *</h3>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border-2 text-left transition-all ${
                  form.category === cat
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                }`}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Unit */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Unit of Measure *</h3>
          <div className="grid grid-cols-3 gap-2">
            {UNITS.map((unit) => (
              <button
                key={unit}
                onClick={() => setForm({ ...form, unit })}
                className={`min-h-[44px] rounded-xl text-sm font-medium border-2 transition-all ${
                  form.unit === unit
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Stock & Pricing */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Stock Settings</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Unit Cost ($)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Reorder Level</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Storage Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Warehouse A, Shelf 3"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Optional notes about this item"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Item"}
        </button>
      </div>
    </div>
  );
}
