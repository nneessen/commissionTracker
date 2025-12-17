// src/features/hierarchy/components/TeamMetricsCard.tsx

import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { HierarchyStats } from "@/types/hierarchy.types";

interface TeamMetricsCardProps {
  stats: HierarchyStats | null | undefined;
  agentCount: number;
  isLoading?: boolean;
}

export function TeamMetricsCard({
  stats,
  agentCount,
  isLoading,
}: TeamMetricsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="p-3">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-4">
            Loading team metrics...
          </div>
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const directAgents = stats?.direct_downlines || 0;
  const indirectAgents = (stats?.total_downlines || 0) - directAgents;
  const mtdOverride = stats?.total_override_income_mtd || 0;
  const ytdOverride = stats?.total_override_income_ytd || 0;
  const qtdOverride = mtdOverride; // Would need actual QTD calculation

  // Calculate averages and growth
  const avgOverridePerAgent = directAgents > 0 ? mtdOverride / directAgents : 0;
  const lastMonthOverride = 0; // Would need historical data from previous month
  const momGrowth =
    lastMonthOverride > 0
      ? ((mtdOverride - lastMonthOverride) / lastMonthOverride) * 100
      : 0;

  // Real calculations from actual data (would need to be passed in or fetched)
  const teamAPTotal = 0; // Sum of all agent AP for the month
  const teamPoliciesMTD = 0; // Sum of all policies written this month
  const avgPremiumPerAgent = directAgents > 0 ? teamAPTotal / directAgents : 0;
  const topPerformerName = "No data"; // Would come from actual agent performance data
  const topPerformerAmount = 0; // Would come from actual AP data
  const recruitmentRate = 0; // Calculate from new agents / total agents
  const retentionRate = directAgents > 0 ? 100 : 0; // Calculate from active / total
  const avgContractLevel = 0; // Would need contract level data
  const pendingInvitations = 0; // Would come from invitations table

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-3">
        <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
          Team Metrics
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Size Column */}
          <div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Total Agents
                </span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {stats?.total_downlines || 0}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Direct Reports
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {directAgents}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Indirect Reports
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {indirectAgents}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Active This Month
                </span>
                <span
                  className={cn(
                    "font-mono",
                    agentCount > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {agentCount}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Growth MTD
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    momGrowth > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : momGrowth < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {momGrowth > 0 ? "↑" : momGrowth < 0 ? "↓" : "→"}{" "}
                  {Math.abs(momGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Override Income Column */}
          <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  MTD Override
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(mtdOverride)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  QTD Override
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(qtdOverride)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  YTD Override
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(ytdOverride)}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Avg/Agent
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(avgOverridePerAgent)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  vs Last Month
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    momGrowth > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : momGrowth < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {momGrowth > 0 ? "+" : ""}
                  {momGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Team Performance Column */}
          <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Team AP Total
                </span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(teamAPTotal)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Policies MTD
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {teamPoliciesMTD}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Avg Premium/Agent
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(avgPremiumPerAgent)}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Top Performer
                </span>
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 truncate max-w-[100px]">
                  {topPerformerName}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">Top AP</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(topPerformerAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Hierarchy Health Column */}
          <div className="border-l border-zinc-200 dark:border-zinc-700 pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Recruitment Rate
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    recruitmentRate > 20
                      ? "text-emerald-600 dark:text-emerald-400"
                      : recruitmentRate > 10
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatPercent(recruitmentRate)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Retention Rate
                </span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    retentionRate > 90
                      ? "text-emerald-600 dark:text-emerald-400"
                      : retentionRate > 80
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatPercent(retentionRate)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Avg Contract Lvl
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {avgContractLevel.toFixed(1)}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Pending Invites
                </span>
                <span
                  className={cn(
                    "font-mono",
                    pendingInvitations > 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-zinc-500 dark:text-zinc-400",
                  )}
                >
                  {pendingInvitations}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {retentionRate > 90
                  ? "✓ Healthy team"
                  : retentionRate > 80
                    ? "⚡ Monitor retention"
                    : "⚠️ Needs attention"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
