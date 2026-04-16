"use client";
import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader, ErrorBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Select, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { ArrowLeft, Camera, CheckCircle2, Clock, Circle, Ban } from "lucide-react";

interface Task {
  id: number; task_code: string; task_type: string; title: string;
  description: string; status: string; requires_photo: boolean;
  requires_before_photo: boolean; requires_after_photo: boolean;
  assigned_to_id: number | null; completed_at: string | null; notes: string | null;
  location_zone: string | null;
}

interface Phase {
  id: number; phase_no: number; phase_name: string; status: string; completion_pct: number;
  tasks: Task[];
}

const taskStatusIcon = (status: string) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "in_progress": return <Clock className="w-5 h-5 text-blue-500" />;
    case "not_applicable": return <Ban className="w-5 h-5 text-gray-300" />;
    default: return <Circle className="w-5 h-5 text-gray-300" />;
  }
};

const taskTypeColor: Record<string, string> = {
  site_inspection: "bg-purple-100 text-purple-700",
  document: "bg-blue-100 text-blue-700",
  material: "bg-orange-100 text-orange-700",
  permit: "bg-yellow-100 text-yellow-700",
  safety: "bg-red-100 text-red-700",
  protection: "bg-gray-100 text-gray-700",
  equipment: "bg-indigo-100 text-indigo-700",
  checklist: "bg-teal-100 text-teal-700",
  surface_prep: "bg-amber-100 text-amber-700",
  repair: "bg-orange-100 text-orange-700",
  painting: "bg-pink-100 text-pink-700",
  inspection: "bg-cyan-100 text-cyan-700",
  touch_up: "bg-lime-100 text-lime-700",
  cleaning: "bg-emerald-100 text-emerald-700",
  dismantling: "bg-stone-100 text-stone-700",
  documentation: "bg-violet-100 text-violet-700",
};

export default function PhasePage({ params }: { params: Promise<{ id: string; phaseId: string }> }) {
  const { id, phaseId } = use(params);
  const { user } = useAuthStore();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ status: "", notes: "", location_zone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: phaseData, isLoading } = useSWR(
    `/projects/${id}/phases/${phaseId}`,
    () => api.get<APIResponse<Phase>>(`/projects/${id}/phases/${phaseId}`)
  );

  const phase = phaseData?.data;
  const canEdit = ["super_admin", "company_admin", "project_manager", "supervisor", "safety_officer"].includes(user?.role || "");

  const openEdit = (task: Task) => {
    setEditTask(task);
    setTaskForm({ status: task.status, notes: task.notes || "", location_zone: task.location_zone || "" });
    setError("");
  };

  const handleSaveTask = async () => {
    if (!editTask) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/projects/${id}/phases/${phaseId}/tasks/${editTask.id}`, taskForm);
      mutate(`/projects/${id}/phases/${phaseId}`);
      setEditTask(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!phase) return <div className="p-6"><ErrorBanner message="Phase not found" /></div>;

  const tasks = phase.tasks || [];
  const byType = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    (acc[t.task_type] = acc[t.task_type] || []).push(t); return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={`Phase ${phase.phase_no}: ${phase.phase_name}`}
        subtitle={`${phase.completion_pct}% complete`}
        actions={
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Project</Button>
          </Link>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Phase status bar */}
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <StatusBadge status={phase.status} />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span className="font-semibold text-gray-900">{phase.completion_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${phase.completion_pct}%` }} />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {tasks.filter((t) => t.status === "completed").length} / {tasks.length} tasks
            </div>
          </CardContent>
        </Card>

        {/* Tasks by type */}
        {Object.entries(byType).map(([type, typeTasks]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${taskTypeColor[type] || "bg-gray-100 text-gray-700"}`}>
                  {type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <span className="text-sm font-normal text-gray-400">({typeTasks.length} tasks)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {typeTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">{taskStatusIcon(task.status)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {task.requires_before_photo && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Camera className="w-3 h-3" /> Before photo
                          </span>
                        )}
                        {task.requires_after_photo && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Camera className="w-3 h-3" /> After photo
                          </span>
                        )}
                        {task.location_zone && (
                          <span className="text-xs text-blue-600">{task.location_zone}</span>
                        )}
                        {task.notes && (
                          <span className="text-xs text-gray-400 italic truncate max-w-xs">{task.notes}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && phase.status !== "locked" && (
                      <button
                        onClick={() => openEdit(task)}
                        className="flex-shrink-0 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Update
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Task Modal */}
      <Modal open={editTask !== null} onClose={() => setEditTask(null)} title="Update Task" size="sm">
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{editTask?.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{editTask?.task_code}</p>
          </div>
          <Select
            label="Status"
            value={taskForm.status}
            onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="not_applicable">Not Applicable</option>
            <option value="blocked">Blocked</option>
          </Select>
          <Textarea
            label="Notes"
            placeholder="Any remarks or observations..."
            value={taskForm.notes}
            onChange={(e) => setTaskForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Location / Zone</label>
            <input
              type="text"
              placeholder="e.g. Level 3 North elevation"
              value={taskForm.location_zone}
              onChange={(e) => setTaskForm((f) => ({ ...f, location_zone: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={handleSaveTask} loading={saving}>Save Changes</Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
