"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ShoppingCart, Plus, AlertTriangle, Clock } from "lucide-react";

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name: string;
  status: string;
  expected_delivery: string;
  actual_delivery: string | null;
  total_value: number | null;
  project_id: number | null;
  project: { id: number; name: string } | null;
  is_overdue: boolean;
  days_overdue: number;
  lines: Array<{ id: number }>;
}

const STATUS_FILTERS = ["All", "DRAFT", "ORDERED", "PARTIAL", "overdue", "DELIVERED", "CANCELLED"];

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") ?? "All";
  const [statusFilter, setStatusFilter] = useState(
    initialFilter === "overdue" ? "overdue" : initialFilter
  );
  const [page, setPage] = useState(1);

  const buildQuery = () => {
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (statusFilter !== "All") p.set("status", statusFilter);
    return p.toString();
  };

  const ordersQuery = buildQuery();
  const { data, isLoading, error } = useSWR<PaginatedResponse<PurchaseOrder>>(
    `/orders?${ordersQuery}`,
    () => api.get<PaginatedResponse<PurchaseOrder>>(`/orders?${ordersQuery}`),
    { revalidateOnFocus: true }
  );

  const { data: overdueData } = useSWR<{ data: { count: number } }>(
    "/orders/overdue",
    () => api.get<{ data: { count: number } }>("/orders/overdue"),
    { refreshInterval: 60000 }
  );

  const orders = data?.data ?? [];
  const overdueCount = (overdueData?.data as Record<string, unknown>)?.count as number ?? 0;

  const statusColor = (o: PurchaseOrder) => {
    if (o.is_overdue) return "bg-red-50 border-red-200";
    if (o.status === "DELIVERED") return "bg-green-50 border-green-200";
    if (o.status === "CANCELLED") return "bg-gray-50 border-gray-200";
    return "bg-white border-gray-200";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Purchase Orders"
        subtitle="Track material orders and deliveries"
        actions={
          <button
            onClick={() => router.push("/orders/new")}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            New Order
          </button>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium flex-1">
              {overdueCount} order{overdueCount > 1 ? "s" : ""} overdue
            </p>
            <button
              onClick={() => setStatusFilter("overdue")}
              className="text-xs text-red-700 underline whitespace-nowrap"
            >
              View →
            </button>
          </div>
        )}

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                statusFilter === s
                  ? s === "overdue"
                    ? "bg-red-600 text-white"
                    : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "All" ? "All" : s}
              {s === "overdue" && overdueCount > 0 && (
                <span className="ml-1.5 bg-white/30 rounded-full px-1">{overdueCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        )}
        {error && <ErrorBanner message="Failed to load orders" />}
        {!isLoading && orders.length === 0 && (
          <EmptyState
            title="No orders found"
            description="Create a purchase order to track material deliveries"
          />
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className={`border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow ${statusColor(order)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">
                      {order.po_number}
                    </span>
                    <StatusBadge status={order.status.toLowerCase()} />
                    {order.is_overdue && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-medium animate-pulse">
                        {order.days_overdue}d late
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{order.supplier_name}</p>
                  {order.project && (
                    <p className="text-xs text-blue-600 mt-0.5">{order.project.name}</p>
                  )}
                </div>
                <ShoppingCart className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ETA: {formatDate(order.expected_delivery)}
                </span>
                {order.total_value && (
                  <span className="font-medium text-gray-800">
                    ${Number(order.total_value).toLocaleString()}
                  </span>
                )}
                <span>{order.lines?.length ?? 0} line{(order.lines?.length ?? 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
