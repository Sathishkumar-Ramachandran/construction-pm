import { cn, getStatusBadgeClass } from "@/lib/utils";

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: BadgeProps) {
  const displayLabel = label || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getStatusBadgeClass(status),
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

interface PhaseBadgeProps {
  phaseNo: number;
  phaseName: string;
  status: string;
}

export function PhaseBadge({ phaseNo, phaseName, status }: PhaseBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
        {phaseNo}
      </span>
      <span className="text-sm font-medium text-gray-900">{phaseName}</span>
      <StatusBadge status={status} />
    </div>
  );
}
