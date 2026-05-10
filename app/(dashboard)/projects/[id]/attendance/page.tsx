"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Spinner, ErrorBanner } from "@/components/ui/loading";
import {
  ChevronLeft, ChevronRight, CheckCircle2,
  UserX, AlertTriangle, WifiOff, Users, HardHat,
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "MC" | "ANNUAL_LEAVE" | "OFF_DAY";

interface WorkerAttendance {
  worker: { id: number; name: string; trade: string; wah_certified: boolean };
  attendance: { id: number; status: string; notes: string | null } | null;
  status: string;
}

interface StaffAttendance {
  user: { id: number; full_name: string; role: string };
  attendance: { id: number; status: string; notes: string | null } | null;
  status: string;
}

interface AttendanceData {
  date: string;
  total_workers: number;
  total_staff: number;
  present: number;
  absent: number;
  half_day: number;
  unmarked: number;
  workers: WorkerAttendance[];
  staff: StaffAttendance[];
}

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; color: string; activeColor: string }[] = [
  { status: "PRESENT",      label: "Present",  color: "border-green-300 text-green-700",  activeColor: "bg-green-600 text-white border-green-600" },
  { status: "ABSENT",       label: "Absent",   color: "border-red-300 text-red-700",      activeColor: "bg-red-600 text-white border-red-600" },
  { status: "HALF_DAY",     label: "½ Day",    color: "border-amber-300 text-amber-700",  activeColor: "bg-amber-500 text-white border-amber-500" },
  { status: "MC",           label: "MC",       color: "border-purple-300 text-purple-700",activeColor: "bg-purple-600 text-white border-purple-600" },
  { status: "ANNUAL_LEAVE", label: "Leave",    color: "border-blue-300 text-blue-700",    activeColor: "bg-blue-600 text-white border-blue-600" },
  { status: "OFF_DAY",      label: "Off",      color: "border-gray-300 text-gray-600",    activeColor: "bg-gray-600 text-white border-gray-600" },
];

function PersonCard({
  name,
  subtitle,
  wahCertified,
  currentStatus,
  note,
  onStatus,
  onNote,
}: {
  name: string;
  subtitle: string;
  wahCertified?: boolean;
  currentStatus: AttendanceStatus | undefined;
  note: string;
  onStatus: (s: AttendanceStatus) => void;
  onNote: (n: string) => void;
}) {
  const needsNote = currentStatus === "ABSENT" || currentStatus === "MC";
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500 capitalize">{subtitle.replace(/_/g, " ")}</p>
        </div>
        {wahCertified && (
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">WAH</span>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {STATUS_BUTTONS.map((btn) => (
          <button
            key={btn.status}
            onClick={() => onStatus(btn.status)}
            className={`min-h-[44px] border-2 rounded-xl text-xs font-medium transition-all ${
              currentStatus === btn.status ? btn.activeColor : `bg-white ${btn.color}`
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {needsNote && (
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Reason (optional)"
          rows={2}
          className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [workerStatus, setWorkerStatus] = useState<Record<number, AttendanceStatus>>({});
  const [workerNotes, setWorkerNotes] = useState<Record<number, string>>({});
  const [staffStatus, setStaffStatus] = useState<Record<number, AttendanceStatus>>({});
  const [staffNotes, setStaffNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setIsOnline(navigator.onLine);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const { data, isLoading, error, mutate } = useSWR<APIResponse<AttendanceData>>(
    `/projects/${projectId}/attendance?date=${dateStr}`,
    () => api.get<APIResponse<AttendanceData>>(`/projects/${projectId}/attendance?date=${dateStr}`),
    {
      onSuccess: (d) => {
        const ws: Record<number, AttendanceStatus> = {};
        const ss: Record<number, AttendanceStatus> = {};
        d.data?.workers.forEach((w) => { if (w.attendance) ws[w.worker.id] = w.attendance.status as AttendanceStatus; });
        d.data?.staff.forEach((s) => { if (s.attendance) ss[s.user.id] = s.attendance.status as AttendanceStatus; });
        setWorkerStatus(ws);
        setStaffStatus(ss);
      },
    }
  );

  const changeDate = (delta: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (newDate <= today) {
      setDateStr(newDate);
      setWorkerStatus({});
      setStaffStatus({});
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const workers = data?.data?.workers ?? [];
      const staff = data?.data?.staff ?? [];

      const workerRecords = workers
        .filter((w) => workerStatus[w.worker.id])
        .map((w) => ({
          worker_id: w.worker.id,
          employee_type: "WORKER" as const,
          status: workerStatus[w.worker.id],
          notes: workerNotes[w.worker.id] ?? null,
        }));

      const staffRecords = staff
        .filter((s) => staffStatus[s.user.id])
        .map((s) => ({
          user_id: s.user.id,
          employee_type: "USER" as const,
          status: staffStatus[s.user.id],
          notes: staffNotes[s.user.id] ?? null,
        }));

      await api.post(`/projects/${projectId}/attendance/bulk`, {
        date: dateStr,
        records: [...workerRecords, ...staffRecords],
      });

      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); mutate(); }, 1500);
    } catch {
      alert("Failed to submit attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const workers = data?.data?.workers ?? [];
  const staff = data?.data?.staff ?? [];
  const today = new Date().toISOString().split("T")[0];
  const isFuture = dateStr > today;
  const totalPeople = workers.length + staff.length;
  const markedCount = Object.keys(workerStatus).length + Object.keys(staffStatus).length;

  const presentCount = [...Object.values(workerStatus), ...Object.values(staffStatus)].filter((s) => s === "PRESENT").length;
  const absentCount = [...Object.values(workerStatus), ...Object.values(staffStatus)].filter((s) => s === "ABSENT").length;
  const halfCount = [...Object.values(workerStatus), ...Object.values(staffStatus)].filter((s) => s === "HALF_DAY").length;
  const unmarked = totalPeople - markedCount;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {showSuccess && (
        <div className="fixed inset-0 bg-green-600 z-50 flex flex-col items-center justify-center text-white">
          <CheckCircle2 className="w-20 h-20 mb-4" />
          <p className="text-3xl font-bold">Attendance Submitted</p>
          <p className="text-lg mt-2 opacity-80">{dateStr}</p>
        </div>
      )}

      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
          <WifiOff className="w-4 h-4" /> No internet connection
        </div>
      )}

      <Header title="Attendance" subtitle={`Project ${projectId}`} />

      {/* Date navigator */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <input
              type="date"
              value={dateStr}
              max={today}
              onChange={(e) => setDateStr(e.target.value)}
              className="text-base font-semibold text-gray-900 text-center border-none outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            disabled={dateStr >= today}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex gap-2 mt-3">
          {[
            { label: "Present",  count: presentCount, color: "bg-green-100 text-green-700" },
            { label: "Absent",   count: absentCount,  color: "bg-red-100 text-red-700" },
            { label: "Half Day", count: halfCount,     color: "bg-amber-100 text-amber-700" },
            { label: "Unmarked", count: unmarked,      color: "bg-gray-100 text-gray-500" },
          ].map((s) => (
            <div key={s.label} className={`flex-1 rounded-lg px-2 py-1.5 text-center ${s.color}`}>
              <p className="text-sm font-bold">{s.count}</p>
              <p className="text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-blue-600" /></div>}
        {error && <ErrorBanner message="Failed to load attendance" />}

        {isFuture && (
          <div className="p-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-700 text-sm">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
              Cannot record future attendance
            </div>
          </div>
        )}

        {!isFuture && !isLoading && totalPeople === 0 && (
          <div className="p-8 text-center text-gray-400">
            <UserX className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-gray-600">No workers or staff assigned</p>
            <p className="text-xs text-gray-400 mt-1">Assign workers via Assignments, or add staff via Team</p>
            <div className="flex gap-3 justify-center mt-3">
              <button
                onClick={() => router.push(`/projects/${projectId}/assignments`)}
                className="text-blue-600 text-sm underline"
              >
                Worker Assignments →
              </button>
              <button
                onClick={() => router.push(`/projects/${projectId}/team`)}
                className="text-blue-600 text-sm underline"
              >
                Project Team →
              </button>
            </div>
          </div>
        )}

        {/* Workers section */}
        {!isFuture && workers.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <HardHat className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Workers ({workers.length})
              </span>
            </div>
            {workers.map((w) => (
              <PersonCard
                key={w.worker.id}
                name={w.worker.name}
                subtitle={w.worker.trade}
                wahCertified={w.worker.wah_certified}
                currentStatus={workerStatus[w.worker.id]}
                note={workerNotes[w.worker.id] ?? ""}
                onStatus={(s) => {
                  setWorkerStatus((p) => ({ ...p, [w.worker.id]: s }));
                  if (s !== "ABSENT" && s !== "MC")
                    setWorkerNotes((p) => { const n = { ...p }; delete n[w.worker.id]; return n; });
                }}
                onNote={(n) => setWorkerNotes((p) => ({ ...p, [w.worker.id]: n }))}
              />
            ))}
          </>
        )}

        {/* Staff section */}
        {!isFuture && staff.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Staff / Team ({staff.length})
              </span>
            </div>
            {staff.map((s) => (
              <PersonCard
                key={s.user.id}
                name={s.user.full_name}
                subtitle={s.user.role}
                currentStatus={staffStatus[s.user.id]}
                note={staffNotes[s.user.id] ?? ""}
                onStatus={(st) => {
                  setStaffStatus((p) => ({ ...p, [s.user.id]: st }));
                  if (st !== "ABSENT" && st !== "MC")
                    setStaffNotes((p) => { const n = { ...p }; delete n[s.user.id]; return n; });
                }}
                onNote={(n) => setStaffNotes((p) => ({ ...p, [s.user.id]: n }))}
              />
            ))}
          </>
        )}

        <div className="h-28" />
      </div>

      {/* Sticky submit */}
      {!isFuture && totalPeople > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || markedCount === 0}
            className="w-full min-h-[56px] bg-green-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <><Spinner className="h-5 w-5 text-white" /> Submitting…</>
            ) : (
              <><CheckCircle2 className="w-6 h-6" /> Submit Attendance — {dateStr}</>
            )}
          </button>
          {markedCount > 0 && (
            <p className="text-center text-xs text-gray-500 mt-1.5">
              {markedCount} of {totalPeople} marked
            </p>
          )}
        </div>
      )}
    </div>
  );
}
