// src/features/training-modules/components/presentations/PresentationStatusBadge.tsx
import type { PresentationStatus } from "../../types/training-module.types";

const STATUS_CONFIG: Record<PresentationStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending Review",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  needs_improvement: {
    label: "Needs Improvement",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

interface PresentationStatusBadgeProps {
  status: PresentationStatus;
}

export function PresentationStatusBadge({ status }: PresentationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
