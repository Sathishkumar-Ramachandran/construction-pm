"use client";
import { useState } from "react";
import useSWR from "swr";
import { api, APIResponse, PaginatedResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, ErrorBanner } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";
import { Download, Users, UserCheck, UserX } from "lucide-react";

interface TodaySummary {
  date: string;
  total_records: number;
  present: number;
  absent: number;
  half_day: number;
  by_project: Array<{ project_id: number | null; project_name: string | null; present: number; absent: number; half_day: number; other: number }>;
}

const TABS = ["Today", "Monthly Report"];

export default function AttendanceOverview() {
  const [activeTab, setActiveTab] = useState("Today");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: todayData, isLoading: todayLoading } = useSWR<APIResponse<TodaySummary>>(
    "/attendance/today",
    () => api.get<APIResponse<TodaySummary>>("/attendance/today"),
    { refreshInterval: 60000 }
  );

  const today = todayData?.data;

  const handleExportMonthly = () => {
    window.open(`/api/v1/attendance/monthly?year=${year}&month=${month}&export=csv`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Attendance" subtitle="Company-wide attendance tracking" />

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <div className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {activeTab === "Today" && (
          <>
            {todayLoading ? (
              <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-blue-600" /></div>
            ) : today ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <UserCheck className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-700">{today.present}</p>
                    <p className="text-xs text-green-600">Present</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <UserX className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-700">{today.absent}</p>
                    <p className="text-xs text-red-600">Absent</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <Users className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-amber-700">{today.half_day}</p>
                    <p className="text-xs text-amber-600">Half Day</p>
                  </div>
                </div>

                {/* By project breakdown */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">By Project</h3>
                  </div>
                  {today.by_project.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">No attendance submitted today</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {today.by_project.map((proj, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between">
                          <p className="text-sm text-gray-700">{proj.project_name ?? `Project ${proj.project_id ?? "Unknown"}`}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-600 font-medium">{proj.present} present</span>
                            {proj.absent > 0 && <span className="text-red-500">{proj.absent} absent</span>}
                            {proj.half_day > 0 && <span className="text-amber-600">{proj.half_day} half</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </>
        )}

        {activeTab === "Monthly Report" && (
          <div className="space-y-4">
            {/* Month picker + export */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString("en-SG", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <button
                  onClick={handleExportMonthly}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center text-gray-500 text-sm">
              Click Export to download the monthly attendance report as CSV
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
