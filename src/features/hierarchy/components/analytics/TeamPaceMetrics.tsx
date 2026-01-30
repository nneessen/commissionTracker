// src/features/hierarchy/components/analytics/TeamPaceMetrics.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamPaceMetrics as TeamPaceMetricsType } from "@/types/team-analytics.types";

interface TeamPaceMetricsProps {
  data: TeamPaceMetricsType | null;
  isLoading?: boolean;
}

/**
 * TeamPaceMetrics - Shows team pace towards goals
 *
 * Displays:
 * - Total AP written by team
 * - Projected totals based on current pace
 * - Surplus/deficit against targets
 * - Time remaining in period
 */
export function TeamPaceMetrics({ data, isLoading }: TeamPaceMetricsProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Pace Metrics
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

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Team Pace Metrics
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {data.timePeriod}
          </div>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-medium",
            data.isProfitable
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {data.isProfitable ? "ON TRACK" : "BEHIND"}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-1">
        {/* Total AP Written */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Team AP Written</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(data.totalAPWritten)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              ({data.totalPoliciesWritten} policies)
            </span>
          </div>
        </div>

        {/* Projected Total */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Projected AP</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(data.projectedAPTotal)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              @ {formatCurrency(data.currentAPPace)}/day
            </span>
          </div>
        </div>

        {/* Average Premium */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Avg Premium</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(data.avgPremiumPerPolicy)}
          </span>
        </div>

        {/* Projected Policies */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Projected Policies</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {data.projectedPolicyTotal}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

        {/* Surplus/Deficit */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase">
            {data.isProfitable ? "Surplus" : "Deficit"}
          </span>
          <span
            className={cn(
              "font-mono font-bold",
              data.isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {formatCurrency(Math.abs(data.surplusDeficit))}
          </span>
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Time Left</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {data.daysRemaining} {data.daysRemaining === 1 ? "day" : "days"}
          </span>
        </div>
      </div>
    </div>
  );
}
