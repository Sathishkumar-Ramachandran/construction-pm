"use client";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Spinner, EmptyState } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";
import { Clock } from "lucide-react";

interface AuditEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_label: string | null;
  changed_fields: string[];
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  change_reason: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-blue-100 text-blue-700",
  UPDATE: "bg-gray-100 text-gray-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-purple-100 text-purple-700",
  APPROVE: "bg-green-100 text-green-700",
  REJECT: "bg-red-100 text-red-700",
  SUBMIT: "bg-blue-100 text-blue-700",
  SIGN_OFF: "bg-green-100 text-green-700",
  ALLOCATE: "bg-indigo-100 text-indigo-700",
  RECEIVE: "bg-teal-100 text-teal-700",
  MARK_ATTENDANCE: "bg-amber-100 text-amber-700",
  BULK_UPDATE: "bg-gray-100 text-gray-700",
  ASSIGN: "bg-blue-100 text-blue-700",
  UNASSIGN: "bg-orange-100 text-orange-700",
  EXPORT: "bg-gray-100 text-gray-700",
};

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val === "[REDACTED]") return "•••";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

interface Props {
  entityType: string;
  entityId: string;
  projectId?: number;
}

export function EntityHistory({ entityType, entityId }: Props) {
  const { data, isLoading, error } = useSWR<APIResponse<AuditEntry[]>>(
    `/audit/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    (path: string) => api.get(path),
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 py-4">Failed to load change history.</p>
    );
  }

  const logs = data?.data ?? [];

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No changes recorded"
        description="Change history will appear here once edits are made."
      />
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gray-500" />
        <h4 className="font-semibold text-gray-900 text-sm">Change History ({logs.length})</h4>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {logs.map((entry) => (
            <div key={entry.id} className="flex gap-4">
              {/* Dot */}
              <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex-shrink-0 z-10 mt-0.5" />

              {/* Content */}
              <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[entry.action] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {entry.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-semibold text-gray-800">
                    {entry.actor_name}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    ({entry.actor_role.replace(/_/g, " ")})
                  </span>
                </div>

                {entry.entity_label && (
                  <p className="text-xs text-gray-600 mb-1">{entry.entity_label}</p>
                )}

                {/* Changed fields */}
                {entry.changed_fields.length > 0 &&
                  entry.previous_data &&
                  entry.new_data && (
                    <div className="mt-2 space-y-1">
                      {entry.changed_fields.slice(0, 5).map((field) => {
                        const prev = entry.previous_data?.[field];
                        const next = entry.new_data?.[field];
                        if (JSON.stringify(prev) === JSON.stringify(next)) return null;
                        return (
                          <div key={field} className="text-xs">
                            <span className="text-gray-500 font-medium capitalize">
                              {field.replace(/_/g, " ")}:
                            </span>{" "}
                            <span className="text-red-500 line-through">
                              {formatFieldValue(prev)}
                            </span>{" "}
                            <span className="text-gray-400">→</span>{" "}
                            <span className="text-green-600">
                              {formatFieldValue(next)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {entry.change_reason && (
                  <p className="text-xs text-blue-600 mt-1 italic">
                    Reason: {entry.change_reason}
                  </p>
                )}

                <p className="text-xs text-gray-400 mt-1.5">
                  {formatDateTime(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
