// src/features/hierarchy/components/analytics/TeamPolicyStatusBreakdown.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamPolicyStatusBreakdown as TeamPolicyStatusBreakdownType } from "@/types/team-analytics.types";

interface TeamPolicyStatusBreakdownProps {
  data: TeamPolicyStatusBreakdownType | null;
  isLoading?: boolean;
}

/**
 * TeamPolicyStatusBreakdown - Team policy status overview
 *
 * Shows active, pending, lapsed, and cancelled policies
 * with premium breakdown and persistency rate
 */
export function TeamPolicyStatusBreakdown({
  data,
  isLoading,
}: TeamPolicyStatusBreakdownProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Policy Status
        </div>
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          {isLoading ? "Loading..." : "No data available"}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Status data for rendering
  const statuses = [
    {
      label: "Active",
      count: data.active.count,
      premium: data.active.premium,
      color: "emerald",
      percent:
        data.total.count > 0
          ? ((data.active.count / data.total.count) * 100).toFixed(1)
          : "0",
    },
    {
      label: "Pending",
      count: data.pending.count,
      premium: data.pending.premium,
      color: "blue",
      percent:
        data.total.count > 0
          ? ((data.pending.count / data.total.count) * 100).toFixed(1)
          : "0",
    },
    {
      label: "Lapsed",
      count: data.lapsed.count,
      premium: data.lapsed.premium,
      color: "amber",
      percent:
        data.total.count > 0
          ? ((data.lapsed.count / data.total.count) * 100).toFixed(1)
          : "0",
    },
    {
      label: "Cancelled",
      count: data.cancelled.count,
      premium: data.cancelled.premium,
      color: "red",
      percent:
        data.total.count > 0
          ? ((data.cancelled.count / data.total.count) * 100).toFixed(1)
          : "0",
    },
  ];

  const getColorClass = (color: string, type: "text" | "bg") => {
    const colors: Record<string, Record<string, string>> = {
      emerald: {
        text: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-600 dark:bg-emerald-400",
      },
      blue: {
        text: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-600 dark:bg-blue-400",
      },
      amber: {
        text: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-600 dark:bg-amber-400",
      },
      red: {
        text: "text-red-600 dark:text-red-400",
        bg: "bg-red-600 dark:bg-red-400",
      },
    };
    return colors[color]?.[type] || "";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Team Policy Status
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {data.total.count} total policies
          </div>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-medium",
            data.persistencyRate >= 80
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : data.persistencyRate >= 60
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {data.persistencyRate.toFixed(1)}% Persistency
        </div>
      </div>

      {/* Status Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {statuses.map((status) => (
          <div
            key={status.label}
            className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {status.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  getColorClass(status.color, "text")
                )}
              >
                {status.percent}%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "font-mono font-bold text-sm",
                  getColorClass(status.color, "text")
                )}
              >
                {status.count}
              </span>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                {formatCurrency(status.premium)}
              </span>
            </div>
            {/* Mini progress bar */}
            <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1">
              <div
                className={cn("h-full", getColorClass(status.color, "bg"))}
                style={{ width: `${status.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          Total Premium
        </span>
        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {formatCurrency(data.total.premium)}
        </span>
      </div>
    </div>
  );
}
