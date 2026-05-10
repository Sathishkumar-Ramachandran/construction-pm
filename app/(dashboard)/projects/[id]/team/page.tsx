"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { ArrowLeft, UserPlus, X, Trash2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

interface TeamMember {
  id: number;
  user_id: number;
  team_role: string;
  user_name: string;
  user_email: string;
  assigned_at: string;
}

interface UserOption {
  id: number;
  full_name: string;
  email: string;
  role: string;
}

const TEAM_ROLES = [
  { value: "project_manager",  label: "Project Manager" },
  { value: "supervisor",       label: "Supervisor" },
  { value: "safety_officer",   label: "Safety Officer" },
  { value: "consultant",       label: "Consultant" },
  { value: "tc_officer",       label: "TC Officer" },
  { value: "engineer",         label: "Engineer" },
  { value: "admin",            label: "Admin" },
];

const ROLE_COLORS: Record<string, string> = {
  project_manager: "bg-blue-100 text-blue-700",
  supervisor:      "bg-orange-100 text-orange-700",
  safety_officer:  "bg-red-100 text-red-700",
  consultant:      "bg-purple-100 text-purple-700",
  tc_officer:      "bg-teal-100 text-teal-700",
  engineer:        "bg-green-100 text-green-700",
  admin:           "bg-gray-100 text-gray-600",
};

export default function ProjectTeamPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const canManage = ["super_admin", "company_admin", "project_manager"].includes(currentUser?.role ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: "", team_role: "supervisor" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading, mutate } = useSWR<APIResponse<TeamMember[]>>(
    `/projects/${projectId}/team`,
    () => api.get<APIResponse<TeamMember[]>>(`/projects/${projectId}/team`)
  );

  const { data: usersData } = useSWR<APIResponse<UserOption[]>>(
    "/auth/users",
    () => api.get<APIResponse<UserOption[]>>("/auth/users")
  );

  const team = data?.data ?? [];
  const allUsers = usersData?.data ?? [];

  // Filter out users already on the team
  const assignedUserIds = new Set(team.map((t) => t.user_id));
  const availableUsers = allUsers.filter((u) => !assignedUserIds.has(u.id));

  const handleAdd = async () => {
    setError("");
    if (!form.user_id) { setError("Please select a user"); return; }
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/team`, {
        user_id: parseInt(form.user_id),
        team_role: form.team_role,
      });
      setShowAdd(false);
      setForm({ user_id: "", team_role: "supervisor" });
      mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add team member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: number, name: string) => {
    if (!confirm(`Remove ${name} from this project team?`)) return;
    try {
      await api.delete(`/projects/${projectId}/team/${userId}`);
      mutate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove team member");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Project Team"
        subtitle={`Project ${projectId}`}
        actions={
          <div className="flex gap-2">
            {canManage && (
              <button
                onClick={() => { setError(""); setShowAdd(true); }}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 space-y-3">
        {isLoading && <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-blue-600" /></div>}

        {!isLoading && team.length === 0 && (
          <EmptyState
            title="No team members yet"
            description="Add users to this project team so they can access the project and mark attendance"
          />
        )}

        {team.map((member) => (
          <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 font-bold text-sm">
                {member.user_name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{member.user_name}</p>
              <p className="text-xs text-gray-400 truncate">{member.user_email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${ROLE_COLORS[member.team_role] ?? "bg-gray-100 text-gray-600"}`}>
                {member.team_role.replace(/_/g, " ")}
              </span>
              {canManage && (
                <button
                  onClick={() => handleRemove(member.user_id, member.user_name)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add member bottom sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/50">
          <div className="bg-white rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add Team Member</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">User *</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select user…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} — {u.role.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && allUsers.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">All users are already assigned to this project</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Project Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEAM_ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setForm({ ...form, team_role: r.value })}
                      className={`min-h-[44px] border-2 rounded-xl text-sm font-medium transition-all text-left px-3 ${
                        form.team_role === r.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={submitting}
                className="w-full min-h-[52px] bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add to Team"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
