"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuthStore } from "@/lib/auth-store";
import { api, APIResponse, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface AppLog {
  id: number;
  level: string;
  category: string;
  message: string;
  details: unknown;
  request_path: string | null;
  request_method: string | null;
  status_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

interface LogStats {
  last24h: { total: number; errors: number; warnings: number };
  byCategory: Array<{ category: string; count: number }>;
  topErrors: Array<{ message: string; created_at: string; request_path: string | null }>;
  avgResponseTimeMs: number;
}

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "bg-gray-100 text-gray-500",
  INFO: "bg-blue-100 text-blue-700",
  WARN: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-600 text-white",
};

export default function SystemLogsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  useEffect(() => {
    if (user && user.role !== "super_admin") router.replace("/dashboard");
  }, [user, router]);

  const buildQuery = () => {
    const p = new URLSearchParams({ limit: "100" });
    if (levelFilter !== "ALL") p.set("level", levelFilter);
    return p.toString();
  };

  const { data: statsData } = useSWR<APIResponse<LogStats>>(
    "/logs/stats",
    () => api.get<APIResponse<LogStats>>("/logs/stats"),
    { refreshInterval: liveMode ? 10000 : 0 }
  );

  const logsQuery = buildQuery();
  const { data: logsData, isLoading, mutate } = useSWR<PaginatedResponse<AppLog>>(
    `/logs?${logsQuery}`,
    () => api.get<PaginatedResponse<AppLog>>(`/logs?${logsQuery}`),
    { refreshInterval: liveMode ? 10000 : 0, keepPreviousData: true }
  );

  const stats = statsData?.data;
  const logs = logsData?.data ?? [];

  const LEVEL_TABS = ["ALL", "ERROR", "WARN", "INFO"];

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="System Logs"
        subtitle="Technical — super admin only"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 ${
                liveMode ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${liveMode ? "bg-white animate-pulse" : "bg-gray-400"}`} />
              {liveMode ? "Live" : "Paused"}
            </button>
            <button
              onClick={() => mutate()}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-4">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats.last24h.total}</p>
              <p className="text-xs text-gray-500">Requests (24h)</p>
            </div>
            <div className="bg-white border border-red-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-red-600">{stats.last24h.errors}</p>
              <p className="text-xs text-gray-500">Errors (24h)</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{stats.last24h.warnings}</p>
              <p className="text-xs text-gray-500">Warnings (24h)</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{stats.avgResponseTimeMs}ms</p>
              <p className="text-xs text-gray-500">Avg Response</p>
            </div>
          </div>
        )}

        {/* Level filter tabs */}
        <div className="flex gap-2">
          {LEVEL_TABS.map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                levelFilter === level
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {isLoading && (
            <div className="flex justify-center py-8"><Spinner className="h-6 w-6 text-blue-600" /></div>
          )}
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${LEVEL_COLORS[log.level] ?? "bg-gray-100"}`}>
                      {log.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{log.message}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{log.category}</span>
                        {log.request_path && <span>{log.request_method} {log.request_path}</span>}
                        {log.status_code && <span>HTTP {log.status_code}</span>}
                        {log.duration_ms && <span>{log.duration_ms}ms</span>}
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </div>
                    {log.details ? (
                      expandedId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    ) : null}
                  </div>
                </button>

                {expandedId === log.id && log.details != null && (
                  <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto max-h-48">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          {!isLoading && logs.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No logs found</div>
          )}
        </div>
      </div>
    </div>
  );
}
