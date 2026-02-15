// src/features/admin/components/lead-vendors/FreshVsAgedPanel.tsx

import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import type { FreshAgedAggregates } from "./LeadIntelligenceDashboard";

interface FreshVsAgedPanelProps {
  aggregates: FreshAgedAggregates;
}

interface ComparisonRow {
  label: string;
  freshValue: number;
  agedValue: number;
  format: (v: number) => string;
  /** If true, lower is better (flips the "winner" highlight) */
  invertWinner?: boolean;
}

export function FreshVsAgedPanel({ aggregates }: FreshVsAgedPanelProps) {
  const { fresh, aged } = aggregates;

  const rows: ComparisonRow[] = [
    {
      label: "Spend",
      freshValue: fresh.spend,
      agedValue: aged.spend,
      format: formatCompactCurrency,
    },
    {
      label: "Conv%",
      freshValue: fresh.convRate,
      agedValue: aged.convRate,
      format: (v) => formatPercent(v),
    },
    {
      label: "ROI%",
      freshValue: fresh.roi,
      agedValue: aged.roi,
      format: (v) => formatPercent(v),
    },
    {
      label: "CPL",
      freshValue: fresh.cpl,
      agedValue: aged.cpl,
      format: (v) => formatCurrency(v),
      invertWinner: true,
    },
  ];

  const hasData = fresh.count > 0 || aged.count > 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
          Fresh vs Aged
        </span>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-zinc-500">Fresh ({fresh.count})</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-zinc-500">Aged ({aged.count})</span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="text-[11px] text-zinc-400 text-center py-3">No data</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <ComparisonBar key={row.label} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonBar({ row }: { row: ComparisonRow }) {
  const total = Math.abs(row.freshValue) + Math.abs(row.agedValue);
  const freshPct = total > 0 ? (Math.abs(row.freshValue) / total) * 100 : 50;
  const agedPct = 100 - freshPct;

  const freshBetter = row.invertWinner
    ? row.freshValue < row.agedValue
    : row.freshValue > row.agedValue;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-[36px] text-right flex-shrink-0">
        {row.label}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium w-[52px] text-right flex-shrink-0",
          freshBetter
            ? "text-blue-600 dark:text-blue-400"
            : "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {row.format(row.freshValue)}
      </span>
      <div className="flex-1 flex h-[6px] rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${freshPct}%` }}
        />
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${agedPct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-[10px] font-medium w-[52px] flex-shrink-0",
          !freshBetter && row.freshValue !== row.agedValue
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {row.format(row.agedValue)}
      </span>
    </div>
  );
}
