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

  // Team performance metrics from stats
  const teamAPTotal = stats?.team_ap_total || 0;
  const teamPoliciesMTD = stats?.team_policies_count || 0;
  const avgPremiumPerAgent = stats?.avg_premium_per_agent || 0;
  const topPerformerName = stats?.top_performer_name || "No data";
  const topPerformerAmount = stats?.top_performer_ap || 0;
  const recruitmentRate = stats?.recruitment_rate || 0;
  const retentionRate = stats?.retention_rate || 0;
  const avgContractLevel = stats?.avg_contract_level || 0;
  const pendingInvitations = stats?.pending_invitations || 0;

  // NEW: Pending AP metrics
  const teamPendingAP = stats?.team_pending_ap_total || 0;
  const teamPendingCount = stats?.team_pending_policies_count || 0;

  // NEW: Team Pace metrics (AP-based)
  // Monthly
  const teamMonthlyAPTarget = stats?.team_monthly_ap_target || 0;
  const teamMonthlyPacePercentage = stats?.team_monthly_pace_percentage || 0;
  const teamMonthlyPaceStatus = stats?.team_monthly_pace_status || "on_pace";
  const teamMonthlyProjected = stats?.team_monthly_projected || 0;

  // Yearly
  const teamYearlyAPTarget = stats?.team_yearly_ap_target || 0;
  const teamYTDAPTotal = stats?.team_ytd_ap_total || 0;
  const teamYearlyPacePercentage = stats?.team_yearly_pace_percentage || 0;
  const teamYearlyPaceStatus = stats?.team_yearly_pace_status || "on_pace";
  const teamYearlyProjected = stats?.team_yearly_projected || 0;

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
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Pending AP
                </span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(teamPendingAP)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Pending Policies
                </span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {teamPendingCount}
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

        {/* Team Pace Section - Monthly & Yearly */}
        {(teamMonthlyAPTarget > 0 || teamYearlyAPTarget > 0) && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
            {/* Monthly Pace */}
            {teamMonthlyAPTarget > 0 && (
              <div>
                <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Monthly Pace
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-[11px]">
                    <div title="Sum of all team members' monthly AP targets (yearly target ÷ 12)">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Target:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamMonthlyAPTarget)}
                      </span>
                    </div>
                    <div title="Active policies closed this month">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        MTD:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamAPTotal)}
                      </span>
                    </div>
                    <div title="(Active + Pending AP) ÷ day of month × days in month">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Projected:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamMonthlyProjected)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold",
                      teamMonthlyPaceStatus === "ahead"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : teamMonthlyPaceStatus === "on_pace"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {teamMonthlyPaceStatus === "ahead"
                      ? "↑ Ahead"
                      : teamMonthlyPaceStatus === "on_pace"
                        ? "→ On Pace"
                        : "↓ Behind"}{" "}
                    ({teamMonthlyPacePercentage.toFixed(0)}%)
                  </div>
                </div>
                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Target = sum of each team member's (policies/yr × avg premium)
                  ÷ 12 • Projected = current submission rate extrapolated to
                  month-end
                </div>
              </div>
            )}

            {/* Yearly Pace */}
            {teamYearlyAPTarget > 0 && (
              <div>
                <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Yearly Pace
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 text-[11px]">
                    <div title="Sum of all team members' yearly AP targets (policies/yr × avg premium)">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Target:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamYearlyAPTarget)}
                      </span>
                    </div>
                    <div title="Active policies closed year-to-date">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        YTD:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamYTDAPTotal)}
                      </span>
                    </div>
                    <div title="(Active YTD + Pending AP) ÷ day of year × 365">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Projected:{" "}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(teamYearlyProjected)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-semibold",
                      teamYearlyPaceStatus === "ahead"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : teamYearlyPaceStatus === "on_pace"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    )}
                  >
                    {teamYearlyPaceStatus === "ahead"
                      ? "↑ Ahead"
                      : teamYearlyPaceStatus === "on_pace"
                        ? "→ On Pace"
                        : "↓ Behind"}{" "}
                    ({teamYearlyPacePercentage.toFixed(0)}%)
                  </div>
                </div>
                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                  Target = sum of each team member's (policies/yr × avg premium)
                  • Projected = current submission rate extrapolated to year-end
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
