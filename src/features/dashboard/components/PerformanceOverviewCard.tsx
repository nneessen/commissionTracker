// src/features/dashboard/components/PerformanceOverviewCard.tsx

import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { PerformanceOverviewCardProps } from "../../../types/dashboard.types";
import { formatCurrency, formatPercent } from "../../../lib/format";
import {
  getPerformanceStatus,
  calculateTargetPercentage,
} from "../../../utils/dashboardCalculations";
import { getPeriodLabel } from "../../../utils/dateRange";
import { cn } from "@/lib/utils";

export const PerformanceOverviewCard: React.FC<
  PerformanceOverviewCardProps
> = ({
  metrics,
  isBreakeven,
  timePeriod,
  surplusDeficit,
  breakevenDisplay,
  policiesNeeded,
  periodSuffix,
}) => {
  const periodLabel = getPeriodLabel(timePeriod);

  const getStatusColorClass = (status: string): string => {
    switch (status.toUpperCase()) {
      case "HIT":
        return "text-emerald-600 dark:text-emerald-400";
      case "GOOD":
        return "text-blue-600 dark:text-blue-400";
      case "FAIR":
        return "text-amber-600 dark:text-amber-400";
      case "POOR":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-zinc-500 dark:text-zinc-400";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Performance Overview
      </div>

      {/* Status Banner */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        {isBreakeven ? (
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        )}
        <div className="flex-1">
          <div
            className={cn(
              "text-[11px] font-semibold",
              isBreakeven
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          >
            {isBreakeven
              ? `Above Breakeven (${periodLabel})`
              : `Below Breakeven (${periodLabel})`}
          </div>
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {isBreakeven
              ? `Surplus: ${formatCurrency(Math.abs(surplusDeficit))}`
              : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Metric
              </th>
              <th className="text-right py-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Current
              </th>
              <th className="text-right py-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Target
              </th>
              <th className="text-right py-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                %
              </th>
              <th className="text-center py-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase w-8">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, index) => {
              const pct = calculateTargetPercentage(row.current, row.target);
              const status = getPerformanceStatus(
                row.current,
                row.target,
                row.showTarget,
              );
              const statusColorClass = getStatusColorClass(status);

              return (
                <tr
                  key={index}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="py-1.5 text-[11px] text-zinc-900 dark:text-zinc-100">
                    {row.metric}
                  </td>
                  <td className="py-1.5 text-right text-[11px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.unit === "$"
                      ? formatCurrency(row.current)
                      : row.unit === "%"
                        ? formatPercent(row.current)
                        : row.current.toFixed(1)}
                  </td>
                  <td className="py-1.5 text-right text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {row.showTarget && row.target
                      ? row.unit === "$"
                        ? formatCurrency(row.target)
                        : row.unit === "%"
                          ? formatPercent(row.target)
                          : row.target
                      : "—"}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-right text-[11px] font-semibold",
                      statusColorClass,
                    )}
                  >
                    {row.showTarget ? `${pct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="py-1.5 text-center">
                    {row.showTarget && (
                      <span
                        className={cn(
                          "inline-block w-1.5 h-1.5 rounded-full",
                          status.toUpperCase() === "HIT" && "bg-emerald-500",
                          status.toUpperCase() === "GOOD" && "bg-blue-500",
                          status.toUpperCase() === "FAIR" && "bg-amber-500",
                          status.toUpperCase() === "POOR" && "bg-red-500",
                          status.toUpperCase() === "NEUTRAL" &&
                            "bg-zinc-400 dark:bg-zinc-500",
                        )}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
