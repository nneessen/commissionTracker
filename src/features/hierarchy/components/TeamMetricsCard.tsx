// src/features/hierarchy/components/TeamMetricsCard.tsx

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/format';
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  DollarSign,
  Target
} from 'lucide-react';
import type { HierarchyStats } from '@/types/hierarchy.types';

interface TeamMetricsCardProps {
  stats: HierarchyStats | null | undefined;
  agentCount: number;
  isLoading?: boolean;
}

export function TeamMetricsCard({ stats, agentCount, isLoading }: TeamMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="text-[11px] text-muted-foreground text-center py-4">
            Loading team metrics...
          </div>
        </CardContent>
      </Card>
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
  const momGrowth = lastMonthOverride > 0
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
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">
          Team Metrics
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Team Size Column */}
          <div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Total Agents</span>
                <span className="font-mono font-bold">{stats?.total_downlines || 0}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Direct Reports</span>
                <span className="font-mono">{directAgents}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Indirect Reports</span>
                <span className="font-mono">{indirectAgents}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Active This Month</span>
                <span className={cn("font-mono",
                  agentCount > 0 ? "text-success" : "text-muted-foreground"
                )}>
                  {agentCount}
                </span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Growth MTD</span>
                <span className={cn("font-mono font-semibold",
                  momGrowth > 0 ? "text-success" : momGrowth < 0 ? "text-error" : "text-muted-foreground"
                )}>
                  {momGrowth > 0 ? '↑' : momGrowth < 0 ? '↓' : '→'} {Math.abs(momGrowth).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Override Income Column */}
          <div className="border-l pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">MTD Override</span>
                <span className="font-mono font-bold text-success">
                  {formatCurrency(mtdOverride)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">QTD Override</span>
                <span className="font-mono">{formatCurrency(qtdOverride)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">YTD Override</span>
                <span className="font-mono">{formatCurrency(ytdOverride)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Avg/Agent</span>
                <span className="font-mono">{formatCurrency(avgOverridePerAgent)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">vs Last Month</span>
                <span className={cn("font-mono text-[10px]",
                  momGrowth > 0 ? "text-success" : momGrowth < 0 ? "text-error" : "text-muted-foreground"
                )}>
                  {momGrowth > 0 ? '+' : ''}{momGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Team Performance Column */}
          <div className="border-l pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Team AP Total</span>
                <span className="font-mono font-bold">{formatCurrency(teamAPTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Policies MTD</span>
                <span className="font-mono">{teamPoliciesMTD}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Avg Premium/Agent</span>
                <span className="font-mono">{formatCurrency(avgPremiumPerAgent)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Top Performer</span>
                <span className="font-mono text-[10px] text-success truncate max-w-[100px]">
                  {topPerformerName}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Top AP</span>
                <span className="font-mono font-semibold">{formatCurrency(topPerformerAmount)}</span>
              </div>
            </div>
          </div>

          {/* Hierarchy Health Column */}
          <div className="border-l pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Recruitment Rate</span>
                <span className={cn("font-mono font-semibold",
                  recruitmentRate > 20 ? "text-success" :
                  recruitmentRate > 10 ? "text-warning" : "text-error"
                )}>
                  {formatPercent(recruitmentRate)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Retention Rate</span>
                <span className={cn("font-mono font-semibold",
                  retentionRate > 90 ? "text-success" :
                  retentionRate > 80 ? "text-warning" : "text-error"
                )}>
                  {formatPercent(retentionRate)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Avg Contract Lvl</span>
                <span className="font-mono">{avgContractLevel.toFixed(1)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Pending Invites</span>
                <span className={cn("font-mono",
                  pendingInvitations > 0 ? "text-info" : "text-muted-foreground"
                )}>
                  {pendingInvitations}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {retentionRate > 90 ? "✓ Healthy team" :
                 retentionRate > 80 ? "⚡ Monitor retention" :
                 "⚠️ Needs attention"}
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}