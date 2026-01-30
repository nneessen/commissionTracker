// src/features/hierarchy/components/analytics/TeamGamePlan.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamGamePlanMetrics } from "@/types/team-analytics.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

interface TeamGamePlanProps {
  data: TeamGamePlanMetrics | null;
  isLoading?: boolean;
}

/**
 * TeamGamePlan - Team progress towards goals
 *
 * Shows aggregated team targets and progress with:
 * - Monthly and yearly goal progress
 * - Top contributors
 * - Underperformers needing attention
 */
export function TeamGamePlan({ data, isLoading }: TeamGamePlanProps) {
  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Game Plan
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
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Game Plan
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {data.currentMonth} • {data.daysRemainingInMonth}d left
        </span>
      </div>

      {/* Monthly Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Monthly Goal Progress
          </span>
          <span className="text-[11px] font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {Math.round(data.teamMonthlyProgressPercent)}%
          </span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              data.teamMonthlyProgressPercent >= 100
                ? "bg-emerald-600 dark:bg-emerald-400"
                : data.teamMonthlyProgressPercent >= 75
                  ? "bg-amber-600 dark:bg-amber-400"
                  : "bg-red-600 dark:bg-red-400"
            )}
            style={{
              width: `${Math.min(100, data.teamMonthlyProgressPercent)}%`,
            }}
          />
        </div>
      </div>

      {/* Monthly Stats Grid */}
      <div className="grid grid-cols-4 gap-1 mb-2 text-[11px]">
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">MTD</div>
          <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(data.teamMTDActual)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Goal</div>
          <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(data.teamMonthlyTarget)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Gap</div>
          <div
            className={cn(
              "font-bold font-mono",
              data.teamMonthlyGap > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(data.teamMonthlyGap)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Days</div>
          <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {data.daysRemainingInMonth}
          </div>
        </div>
      </div>

      {/* Annual Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Annual Goal Progress
          </span>
          <span className="text-[11px] font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {Math.round(data.teamYearlyProgressPercent)}%
          </span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              data.teamYearlyProgressPercent >= 100
                ? "bg-emerald-600 dark:bg-emerald-400"
                : "bg-amber-600 dark:bg-amber-400"
            )}
            style={{
              width: `${Math.min(100, data.teamYearlyProgressPercent)}%`,
            }}
          />
        </div>
      </div>

      {/* Annual Stats Grid */}
      <div className="grid grid-cols-4 gap-1 mb-2 text-[11px]">
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">YTD</div>
          <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.teamYTDActual)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Annual</div>
          <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(data.teamYearlyTarget)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Need</div>
          <div className="font-bold font-mono text-red-600 dark:text-red-400">
            {formatCurrency(data.teamYearlyGap)}
          </div>
        </div>
        <div className="p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
          <div className="text-zinc-400 dark:text-zinc-500">Months</div>
          <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {data.monthsRemainingInYear}
          </div>
        </div>
      </div>

      {/* Team Status */}
      <div className="grid grid-cols-3 gap-1 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded mb-2">
        <div className="text-center flex items-center justify-center gap-1">
          <Users className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {data.totalAgents} agents
          </span>
        </div>
        <div className="text-center flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {data.agentsOnTrack} on track
          </span>
        </div>
        <div className="text-center flex items-center justify-center gap-1">
          <TrendingDown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {data.agentsBehind} behind
          </span>
        </div>
      </div>

      {/* Top Contributors */}
      {data.topContributors.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Top Contributors
          </div>
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-6 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Agent
                </TableHead>
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  AP
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topContributors.map((agent) => (
                <TableRow
                  key={agent.agentId}
                  className="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <TableCell className="p-1 text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                    {agent.agentName}
                  </TableCell>
                  <TableCell className="p-1 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(agent.totalAP)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Status Footer */}
      <div
        className={cn(
          "mt-2 p-1.5 rounded text-center text-[11px] font-medium",
          data.teamMonthlyGap > 0
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}
      >
        {data.teamMonthlyGap > 0
          ? `Team needs ${formatCurrency(data.teamMonthlyGap)} more to hit monthly goal`
          : "Team Monthly Goal Achieved!"}
      </div>
    </div>
  );
}
