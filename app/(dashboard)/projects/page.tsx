"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { api, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/ui/loading";
import { Select } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate, phaseIcon, PHASE_NAMES, HDB_TOWNS } from "@/lib/utils";
import { Plus, FolderKanban, MapPin, Calendar, ArrowRight } from "lucide-react";

interface Project {
  id: number; project_no: string; name: string; project_type: string;
  hdb_block: string; hdb_street: string; hdb_town: string; town_council: string;
  status: string; current_phase: number; planned_start_date: string; planned_end_date: string;
  contract_value: number;
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState("");
  const [townFilter, setTownFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter) params.set("status", statusFilter);
  if (townFilter) params.set("hdb_town", townFilter);

  const { data, isLoading } = useSWR(
    `/projects?${params}`,
    () => api.get<PaginatedResponse<Project>>(`/projects?${params}`)
  );

  const projects = data?.data || [];
  const canCreate = ["super_admin", "company_admin"].includes(user?.role || "");

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Projects"
        subtitle={`${data?.pagination?.total || 0} total projects`}
        actions={
          canCreate && (
            <Link href="/projects/new">
              <Button><Plus className="w-4 h-4" /> New Project</Button>
            </Link>
          )
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full sm:w-44">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pre_start">Pre-Start</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </Select>
          <Select value={townFilter} onChange={(e) => { setTownFilter(e.target.value); setPage(1); }} className="w-full sm:w-44">
            <option value="">All Towns</option>
            {HDB_TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <PageLoader />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="w-12 h-12" />}
            title="No projects found"
            description={statusFilter || townFilter ? "Try adjusting your filters" : "Create your first project to get started"}
            action={canCreate ? <Link href="/projects/new"><Button size="sm"><Plus className="w-4 h-4" /> New Project</Button></Link> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-150">
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-gray-400 font-mono">{project.project_no}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StatusBadge status={project.status} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-2xl">
                        {phaseIcon(project.current_phase)}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      Blk {project.hdb_block} {project.hdb_street}, {project.hdb_town}
                    </div>

                    {/* Phase progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Phase {project.current_phase}/7</span>
                        <span className="text-xs text-gray-500">{PHASE_NAMES[project.current_phase]}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(project.current_phase / 7) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      {project.planned_start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.planned_start_date)}
                        </span>
                      )}
                      {project.planned_end_date && (
                        <span>Due {formatDate(project.planned_end_date)}</span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{project.town_council}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500">Page {page} of {data.pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={page === data.pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
