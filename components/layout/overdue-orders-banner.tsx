"use client";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface OverdueData {
  count: number;
  earliest_date: string | null;
  orders: Array<{ id: number; po_number: string; days_overdue: number }>;
}

export function OverdueOrdersBanner() {
  const router = useRouter();

  const { data } = useSWR<{ data: OverdueData }>(
    "/orders/overdue",
    (path: string) => api.get(path),
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  const info = data?.data as OverdueData | undefined;

  if (!info || info.count === 0) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium truncate">
          {info.count} order{info.count > 1 ? "s" : ""} overdue
          {info.earliest_date ? ` — earliest: ${formatDate(info.earliest_date)}` : ""}
        </span>
      </div>
      <button
        onClick={() => router.push("/orders?filter=overdue")}
        className="text-white underline text-sm whitespace-nowrap ml-3 flex-shrink-0"
      >
        View →
      </button>
    </div>
  );
}
