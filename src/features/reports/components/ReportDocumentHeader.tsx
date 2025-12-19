// src/features/reports/components/ReportDocumentHeader.tsx

import type { ReportFilters } from "../../../types/reports.types";

interface ReportDocumentHeaderProps {
  title: string;
  filters: ReportFilters;
}

/**
 * Header section within the report document itself.
 * Shows report title and date range.
 */
export function ReportDocumentHeader({
  title,
  filters,
}: ReportDocumentHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {filters.startDate.toLocaleDateString()} -{" "}
            {filters.endDate.toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
