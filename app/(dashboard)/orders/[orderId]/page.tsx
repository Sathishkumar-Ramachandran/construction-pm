"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { StatusBadge } from "@/components/ui/badge";
import { EntityHistory } from "@/components/audit/entity-history";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Package, Truck, X, CheckCircle2, XCircle } from "lucide-react";

interface OrderLine {
  id: number;
  qty_ordered: number;
  qty_received: number;
  unit_price: number | null;
  description: string | null;
  inventory_item: { name: string; unit: string; code: string };
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name: string;
  supplier_contact: string | null;
  status: string;
  expected_delivery: string;
  actual_delivery: string | null;
  total_value: number | null;
  notes: string | null;
  is_overdue: boolean;
  days_overdue: number;
  project: { id: number; name: string } | null;
  lines: OrderLine[];
  created_by: { full_name: string };
}

const TABS = [
  { id: "details", label: "Details" },
  { id: "history", label: "History" },
];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [showReceiveSheet, setShowReceiveSheet] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading, error, mutate } = useSWR<APIResponse<PurchaseOrder>>(
    `/orders/${orderId}`,
    () => api.get<APIResponse<PurchaseOrder>>(`/orders/${orderId}`)
  );

  if (isLoading) return <PageLoader />;
  if (error || !data?.data) return <ErrorBanner message="Order not found" />;

  const order = data.data;

  const handleReceive = async () => {
    setSubmitting(true);
    try {
      const lines = order.lines
        .filter((l) => receiveQtys[l.id] && parseFloat(receiveQtys[l.id]) > 0)
        .map((l) => ({ line_id: l.id, qty_received: parseFloat(receiveQtys[l.id]) }));

      if (lines.length === 0) return;

      await api.post(`/orders/${orderId}/receive`, {
        received_date: new Date().toISOString().split("T")[0],
        lines,
      });

      setShowReceiveSheet(false);
      setReceiveQtys({});
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      mutate();
    } finally {
      setSubmitting(false);
    }
  };

  const canReceive = ["ORDERED", "PARTIAL"].includes(order.status);
  const canCancel = ["DRAFT", "ORDERED"].includes(order.status);

  const handleCancel = async () => {
    if (!confirm(`Cancel order ${order.po_number}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      mutate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Success flash */}
      {showSuccess && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white">
          <CheckCircle2 className="w-16 h-16 mb-4" />
          <p className="text-2xl font-bold">Delivery Recorded</p>
        </div>
      )}

      <Header
        title={order.po_number}
        subtitle={order.supplier_name}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {/* Overdue banner */}
      {order.is_overdue && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-medium flex items-center gap-2">
          <span>Order is {order.days_overdue} day(s) overdue — expected {formatDate(order.expected_delivery)}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <div className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {activeTab === "details" && (
          <>
            {/* Status + key info */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={order.status.toLowerCase()} />
                {order.project && (
                  <span className="text-xs text-blue-600">{order.project.name}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Expected Delivery</p>
                  <p className={`font-medium ${order.is_overdue ? "text-red-600" : "text-gray-900"}`}>
                    {formatDate(order.expected_delivery)}
                  </p>
                </div>
                {order.actual_delivery && (
                  <div>
                    <p className="text-xs text-gray-500">Actual Delivery</p>
                    <p className="font-medium text-green-600">{formatDate(order.actual_delivery)}</p>
                  </div>
                )}
                {order.total_value && (
                  <div>
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="font-medium text-gray-900">${Number(order.total_value).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Created by</p>
                  <p className="font-medium text-gray-900">{order.created_by.full_name}</p>
                </div>
              </div>
              {order.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">{order.notes}</p>
              )}
            </div>

            {/* Line items */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Order Lines</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {order.lines.map((line) => {
                  const rcvPct = Math.round((Number(line.qty_received) / Number(line.qty_ordered)) * 100);
                  return (
                    <div key={line.id} className="px-4 py-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{line.inventory_item.name}</span>
                        <span className="text-gray-500">
                          {line.qty_received}/{line.qty_ordered} {line.inventory_item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${rcvPct >= 100 ? "bg-green-500" : rcvPct > 0 ? "bg-blue-500" : "bg-gray-300"}`}
                          style={{ width: `${rcvPct}%` }}
                        />
                      </div>
                      {line.unit_price && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          ${Number(line.unit_price).toFixed(2)} / {line.inventory_item.unit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === "history" && (
          <EntityHistory entityType="PurchaseOrder" entityId={orderId} />
        )}
      </div>

      {/* Sticky action bar */}
      {(canReceive || canCancel) && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-2">
          {canReceive && (
            <button
              onClick={() => setShowReceiveSheet(true)}
              className="w-full min-h-[52px] bg-green-600 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-green-700"
            >
              <Truck className="w-5 h-5" />
              Record Delivery
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full min-h-[44px] bg-white border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? "Cancelling…" : "Cancel Order"}
            </button>
          )}
        </div>
      )}

      {/* Receive bottom sheet */}
      {showReceiveSheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Record Goods Received</h3>
              <button onClick={() => setShowReceiveSheet(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {order.lines.filter((l) => Number(l.qty_received) < Number(l.qty_ordered)).map((line) => {
                const remaining = Number(line.qty_ordered) - Number(line.qty_received);
                return (
                  <div key={line.id} className="space-y-1">
                    <label className="text-sm font-medium text-gray-800">
                      {line.inventory_item.name}
                      <span className="text-gray-400 font-normal"> (remaining: {remaining} {line.inventory_item.unit})</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={remaining}
                        value={receiveQtys[line.id] ?? ""}
                        onChange={(e) => setReceiveQtys({ ...receiveQtys, [line.id]: e.target.value })}
                        placeholder={`0 – ${remaining}`}
                        className="flex-1 px-4 py-3 text-lg focus:outline-none"
                      />
                      <span className="px-3 text-gray-500 text-sm bg-gray-50 h-full flex items-center border-l border-gray-200">
                        {line.inventory_item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleReceive}
              disabled={submitting}
              className="w-full min-h-[52px] mt-6 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Confirm Receipt"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
