"use client";
import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PageLoader, EmptyState, ErrorBanner, SuccessBanner } from "@/components/ui/loading";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate, PHASE_NAMES, phaseIcon } from "@/lib/utils";
import {
  ArrowLeft, MapPin, Calendar, CheckCircle2, Clock, Lock,
  AlertTriangle, ClipboardList, FileText, Package,
  Shield, Wrench, ChevronRight, Plus, Unlock,
} from "lucide-react";

interface Phase {
  id: number; phase_no: number; phase_name: string; status: string;
  completion_pct: number; planned_start_date: string; planned_end_date: string;
  actual_start_date: string; actual_end_date: string;
}

interface ProjectDetail {
  id: number; project_no: string; name: string; project_type: string;
  hdb_block: string; hdb_street: string; hdb_town: string; town_council: string;
  status: string; current_phase: number; contract_value: number;
  planned_start_date: string; planned_end_date: string;
  tc_reference_no: string; scope_description: string; total_floors: number;
  phases: Phase[];
}

interface DashboardData {
  project: { overall_completion_pct: number };
  permits: { total: number; approved: number; pending: number };
  documents: { total: number; approved: number; pending: number };
  defects: { open: number; high: number };
}

const phaseStatusIcon = (status: string) => {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case "in_progress": return <Clock className="w-5 h-5 text-blue-500" />;
    case "unlocked": return <ChevronRight className="w-5 h-5 text-yellow-500" />;
    default: return <Lock className="w-5 h-5 text-gray-300" />;
  }
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [unlockPhaseId, setUnlockPhaseId] = useState<number | null>(null);
  const [unlockError, setUnlockError] = useState<{ message: string; unmet: string[] } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const { data: projectData, isLoading } = useSWR(
    `/projects/${id}`,
    () => api.get<APIResponse<ProjectDetail>>(`/projects/${id}`)
  );

  const { data: dashData } = useSWR(
    `/projects/${id}/reports/dashboard`,
    () => api.get<APIResponse<DashboardData>>(`/projects/${id}/reports/dashboard`)
  );

  const project = projectData?.data;
  const dash = dashData?.data;

  const canManage = ["super_admin", "company_admin", "project_manager"].includes(user?.role || "");

  const handleUnlockPhase = async (phaseId: number) => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      await api.post(`/projects/${id}/phases/${phaseId}/unlock`);
      setUnlockPhaseId(null);
      setSuccessMsg("Phase unlocked successfully!");
      mutate(`/projects/${id}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      const errData = (err as { data?: { detail?: { unmet_requirements?: { description: string }[]; message: string } } })?.data;
      if (errData?.detail?.unmet_requirements) {
        setUnlockError({
          message: errData.detail.message || "Cannot unlock phase",
          unmet: errData.detail.unmet_requirements.map((r: { description: string }) => r.description),
        });
      } else {
        setUnlockError({ message: (err as Error).message || "Failed to unlock phase", unmet: [] });
      }
    } finally {
      setUnlocking(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!project) return <div className="p-6"><ErrorBanner message="Project not found" /></div>;

  const phases = project.phases || [];
  const completionPct = dash?.project?.overall_completion_pct ?? 0;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={project.name}
        subtitle={`${project.project_no} · Blk ${project.hdb_block} ${project.hdb_street}`}
        actions={
          <Link href="/projects">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Projects</Button>
          </Link>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {successMsg && <SuccessBanner message={successMsg} />}

        {/* Project Info + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Project Info Card */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={project.status} />
                    <span className="text-xs text-gray-400">{project.project_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{project.name}</h2>
                </div>
                {canManage && (
                  <Link href={`/projects/${id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="font-medium text-gray-700 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {project.hdb_town}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Town Council</p>
                  <p className="font-medium text-gray-700 mt-0.5">{project.town_council}</p>
                </div>
                {project.total_floors && (
                  <div>
                    <p className="text-xs text-gray-400">Floors</p>
                    <p className="font-medium text-gray-700 mt-0.5">{project.total_floors}</p>
                  </div>
                )}
                {project.planned_start_date && (
                  <div>
                    <p className="text-xs text-gray-400">Start Date</p>
                    <p className="font-medium text-gray-700 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" /> {formatDate(project.planned_start_date)}
                    </p>
                  </div>
                )}
                {project.planned_end_date && (
                  <div>
                    <p className="text-xs text-gray-400">End Date</p>
                    <p className="font-medium text-gray-700 mt-0.5">{formatDate(project.planned_end_date)}</p>
                  </div>
                )}
                {project.tc_reference_no && (
                  <div>
                    <p className="text-xs text-gray-400">TC Reference</p>
                    <p className="font-medium text-gray-700 mt-0.5">{project.tc_reference_no}</p>
                  </div>
                )}
              </div>

              {/* Overall progress */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Overall Completion</span>
                  <span className="font-semibold text-gray-900">{completionPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-lg"><ClipboardList className="w-4 h-4 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-gray-400">Permits</p>
                  <p className="text-sm font-semibold">{dash?.permits?.approved ?? "—"} / {dash?.permits?.total ?? "—"} Approved</p>
                  {(dash?.permits?.pending ?? 0) > 0 && <p className="text-xs text-yellow-600">{dash?.permits?.pending} pending</p>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg"><FileText className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-400">Documents</p>
                  <p className="text-sm font-semibold">{dash?.documents?.approved ?? "—"} / {dash?.documents?.total ?? "—"} Approved</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Open Defects</p>
                  <p className="text-sm font-semibold">{dash?.defects?.open ?? "—"} Open</p>
                  {(dash?.defects?.high ?? 0) > 0 && <p className="text-xs text-red-600">{dash?.defects?.high} high priority</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Phase Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Project Phases</CardTitle>
            <span className="text-xs text-gray-400">Phase {project.current_phase} / 7 active</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {phases.map((phase) => (
                <div key={phase.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0">{phaseStatusIcon(phase.status)}</div>

                  {/* Phase name + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-gray-400">Ph {phase.phase_no}</span>
                      <p className="text-sm font-medium text-gray-900 leading-tight truncate">{phase.phase_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${phase.completion_pct}%`,
                            backgroundColor: phase.status === "completed" ? "#16a34a" : phase.status === "in_progress" ? "#2563eb" : "#9ca3af",
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{phase.completion_pct}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusBadge status={phase.status} className="hidden sm:inline-flex" />
                    {phase.status === "locked" && canManage && (
                      <button
                        onClick={() => { setUnlockPhaseId(phase.id); setUnlockError(null); }}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors"
                        title="Check gate requirements"
                      >
                        <Unlock className="w-4 h-4 text-yellow-500" />
                      </button>
                    )}
                    <Link href={`/projects/${id}/phases/${phase.id}`}>
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Permits", icon: Shield, href: `/projects/${id}/permits`, color: "text-yellow-600 bg-yellow-50" },
            { label: "Documents", icon: FileText, href: `/projects/${id}/documents`, color: "text-blue-600 bg-blue-50" },
            { label: "Materials", icon: Package, href: `/projects/${id}/materials`, color: "text-purple-600 bg-purple-50" },
            { label: "Defects", icon: AlertTriangle, href: `/projects/${id}/defects`, color: "text-red-600 bg-red-50" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className={`p-3 rounded-xl ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Unlock Phase Modal */}
      <Modal open={unlockPhaseId !== null} onClose={() => setUnlockPhaseId(null)} title="Unlock Phase" size="sm">
        {unlockError ? (
          <div className="space-y-3">
            <ErrorBanner message={unlockError.message} />
            {unlockError.unmet.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Requirements not met:</p>
                <ul className="space-y-1">
                  {unlockError.unmet.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ModalFooter>
              <Button variant="outline" onClick={() => setUnlockPhaseId(null)}>Close</Button>
            </ModalFooter>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This will check all gate requirements and unlock the phase if all conditions are met.
            </p>
            <ModalFooter>
              <Button variant="outline" onClick={() => setUnlockPhaseId(null)}>Cancel</Button>
              <Button
                onClick={() => unlockPhaseId && handleUnlockPhase(unlockPhaseId)}
                loading={unlocking}
              >
                Check & Unlock
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
