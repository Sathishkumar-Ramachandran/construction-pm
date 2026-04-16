"use client";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader, EmptyState, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { roleLabel, formatDateTime } from "@/lib/utils";
import { Plus, Users, Mail, Clock, CheckCircle2, XCircle } from "lucide-react";

interface UserItem {
  id: number; email: string; full_name: string; phone: string | null;
  role: string; is_active: boolean; is_invite_accepted: boolean;
  last_login_at: string | null; created_at: string;
}

const INVITABLE_ROLES = [
  { value: "company_admin", label: "Company Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "supervisor", label: "Site Supervisor" },
  { value: "safety_officer", label: "Safety Officer" },
  { value: "consultant", label: "Consultant" },
  { value: "tc_officer", label: "TC Officer" },
];

export default function UsersPage() {
  const { user } = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", full_name: "", role: "project_manager", phone: "" });

  const { data, isLoading } = useSWR(
    "/auth/users",
    () => api.get<APIResponse<UserItem[]>>("/auth/users")
  );
  const users = data?.data || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/auth/invite", form);
      mutate("/auth/users");
      setShowInvite(false);
      setForm({ email: "", full_name: "", role: "project_manager", phone: "" });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (userId: number) => {
    if (!confirm("Deactivate this user? They will lose access immediately.")) return;
    try {
      await api.patch(`/auth/users/${userId}/deactivate`, {});
      mutate("/auth/users");
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleActivate = async (userId: number) => {
    try {
      await api.patch(`/auth/users/${userId}/activate`, {});
      mutate("/auth/users");
    } catch (err: unknown) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-purple-100 text-purple-700",
    company_admin: "bg-blue-100 text-blue-700",
    project_manager: "bg-indigo-100 text-indigo-700",
    supervisor: "bg-orange-100 text-orange-700",
    safety_officer: "bg-red-100 text-red-700",
    consultant: "bg-teal-100 text-teal-700",
    tc_officer: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Team Members"
        subtitle="Manage user accounts and access"
        actions={
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Plus className="w-4 h-4" /> Invite User
          </Button>
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        {isLoading ? <PageLoader /> : users.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No users yet"
            description="Invite team members to give them access to this system"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <Card key={u.id} className={!u.is_active ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-bold text-sm">
                        {u.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] || "bg-gray-100 text-gray-600"}`}>
                      {roleLabel(u.role)}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-gray-900">{u.full_name}</h3>
                  <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Mail className="w-3 h-3" /> {u.email}
                  </p>

                  <div className="mt-3 flex items-center gap-3 text-xs">
                    {u.is_invite_accepted ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Clock className="w-3 h-3" /> Invite pending
                      </span>
                    )}
                    {!u.is_active && (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-3 h-3" /> Deactivated
                      </span>
                    )}
                  </div>

                  {u.last_login_at && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Last login: {formatDateTime(u.last_login_at)}
                    </p>
                  )}

                  {u.id !== user?.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {u.is_active ? (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(u.id)}
                          className="text-xs text-green-600 hover:text-green-800 transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member" size="md">
        <form onSubmit={handleInvite} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input
            label="Full Name *"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
            placeholder="e.g. Tan Ah Kow"
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            placeholder="e.g. tan@company.com"
          />
          <Select
            label="Role *"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {INVITABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. 9123 4567"
          />
          <p className="text-xs text-gray-500">
            An invite email will be sent. The user must set their password before they can log in.
          </p>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Send Invite</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
