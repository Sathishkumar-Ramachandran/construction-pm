"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { Package, Plus, Search, AlertTriangle, TrendingDown, X } from "lucide-react";

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  qty_on_hand: number;
  qty_allocated: number;
  qty_available: number;
  reorder_level: number;
  is_low_stock: boolean;
  is_active: boolean;
}

const CATEGORIES = [
  "All", "PRIMER", "SEALER", "FINISHING_PAINT", "WEATHERCOAT",
  "ELASTOMERIC", "EMULSION", "FILLER", "SEALANT", "SCAFFOLD_MATERIAL", "TOOLS",
];

const CAT_LABELS: Record<string, string> = {
  PRIMER: "Primer", SEALER: "Sealer", FINISHING_PAINT: "Finishing Paint",
  WEATHERCOAT: "Weathercoat", ELASTOMERIC: "Elastomeric", EMULSION: "Emulsion",
  FILLER: "Filler", SEALANT: "Sealant", SCAFFOLD_MATERIAL: "Scaffold", TOOLS: "Tools",
  MISCELLANEOUS: "Misc", PROTECTIVE_COATING: "Protective Coat",
  SAFETY_EQUIPMENT: "Safety Equip",
};

export default function InventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const buildQuery = () => {
    const p = new URLSearchParams({ limit: "100" });
    if (search) p.set("search", search);
    if (category !== "All") p.set("category", category);
    if (showLowOnly) p.set("lowStockOnly", "true");
    return p.toString();
  };

  const query = buildQuery();
  const { data, isLoading, error } = useSWR<PaginatedResponse<InventoryItem>>(
    `/inventory?${query}`,
    () => api.get<PaginatedResponse<InventoryItem>>(`/inventory?${query}`),
    { revalidateOnFocus: true }
  );

  const { data: lowStockData } = useSWR<APIResponse<InventoryItem[]>>(
    "/inventory/low-stock",
    () => api.get<APIResponse<InventoryItem[]>>("/inventory/low-stock")
  );

  const items = data?.data ?? [];
  const lowStockCount = lowStockData?.data?.length ?? 0;

  const stockPct = (item: InventoryItem) => {
    if (item.qty_on_hand <= 0) return 0;
    return Math.min(100, Math.round((item.qty_available / Math.max(item.qty_on_hand, 0.01)) * 100));
  };

  const stockBarColor = (item: InventoryItem) => {
    if (item.is_low_stock) return "bg-red-500";
    if (stockPct(item) < 40) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Inventory"
        subtitle="Company-wide material stock"
        actions={
          <button
            onClick={() => router.push("/inventory/new")}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Low stock banner */}
        {lowStockCount > 0 && (
          <button
            onClick={() => setShowLowOnly(!showLowOnly)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
              showLowOnly
                ? "bg-amber-500 border-amber-500 text-white"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {lowStockCount} item{lowStockCount > 1 ? "s" : ""} low on stock
              {showLowOnly ? " — tap to show all" : " — tap to view"}
            </span>
            {showLowOnly && <X className="w-4 h-4 ml-auto" />}
          </button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                category === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat === "All" ? "All" : (CAT_LABELS[cat] ?? cat)}
            </button>
          ))}
        </div>

        {/* Item list */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        )}
        {error && <ErrorBanner message="Failed to load inventory" />}
        {!isLoading && items.length === 0 && (
          <EmptyState
            title="No items found"
            description="Add inventory items to start tracking stock"
          />
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/inventory/${item.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {item.code}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {CAT_LABELS[item.category] ?? item.category}
                    </span>
                    {item.is_low_stock && (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Low
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  {item.brand && (
                    <p className="text-xs text-gray-500">{item.brand}</p>
                  )}
                </div>
                <Package className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
              </div>

              {/* Stock bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${stockBarColor(item)}`}
                    style={{ width: `${stockPct(item)}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-2 grid grid-cols-4 gap-1 text-xs">
                {[
                  { label: "On Hand", value: `${item.qty_on_hand} ${item.unit}` },
                  { label: "Allocated", value: `${item.qty_allocated} ${item.unit}` },
                  { label: "Available", value: `${item.qty_available} ${item.unit}`, highlight: item.is_low_stock },
                  { label: "Reorder", value: `${item.reorder_level} ${item.unit}` },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-gray-400">{s.label}</p>
                    <p className={`font-medium ${s.highlight ? "text-red-600" : "text-gray-700"}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
