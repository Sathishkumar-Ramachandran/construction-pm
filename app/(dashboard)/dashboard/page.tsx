"use client";
import useSWR from "swr";
import Link from "next/link";
import { api, APIResponse, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { StatusBadge, PhaseBadge } from "@/components/ui/badge";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate, phaseIcon } from "@/lib/utils";
import {
  FolderKanban, FileCheck, AlertTriangle, ClipboardList,
  ArrowRight, TrendingUp,
} from "lucide-react";

interface Project {
  id: number; project_no: string; name: string; hdb_block: string;
  hdb_street: string; hdb_town: string; status: string; current_phase: number;
  planned_end_date: string;
}

interface DashboardData {
  project: { id: number; name: string; status: string; current_phase: number; overall_completion_pct: number; planned_end_date: string; };
  phases: { phase_no: number; phase_name: string; status: string; completion_pct: number }[];
  permits: { total: number; approved: number; pending: number; rejected: number };
  documents: { total: number; approved: number; pending: number };
  materials: { total: number; approved: number; pending: number };
  defects: { open: number; in_progress: number; rectified: number; high: number };
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: projectsData, isLoading } = useSWR(
    "/projects?limit=6",
    () => api.get<PaginatedResponse<Project>>("/projects?limit=6")
  );

  const projects = projectsData?.data || [];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard" subtitle={`Welcome back, ${user?.full_name?.split(" ")[0]}`} />

      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Projects"
            value={projects.filter((p) => p.status === "in_progress").length}
            icon={<FolderKanban className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            label="Total Projects"
            value={projectsData?.pagination?.total || 0}
            icon={<ClipboardList className="w-5 h-5" />}
            color="gray"
          />
          <StatCard
            label="Pending Approvals"
            value="—"
            sub="Permits & Documents"
            icon={<FileCheck className="w-5 h-5" />}
            color="yellow"
          />
          <StatCard
            label="Open Defects"
            value="—"
            sub="Across all projects"
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
          />
        </div>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <PageLoader />
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="w-12 h-12" />}
                title="No projects yet"
                description="Create your first project to get started"
                action={<Link href="/projects/new" className="text-sm text-blue-600 hover:underline">Create Project</Link>}
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">{project.project_no}</span>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        Blk {project.hdb_block} {project.hdb_street}, {project.hdb_town}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-base sm:text-lg">{phaseIcon(project.current_phase)}</p>
                        <p className="text-xs text-gray-400">Ph {project.current_phase}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
