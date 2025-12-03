// src/features/analytics/components/GamePlan.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalyticsData } from '../../../hooks';
import { useUserTargets } from '../../../hooks/targets/useUserTargets';
import { useExpenses } from '../../../hooks/expenses/useExpenses';
import { gamePlanService } from '../../../services/analytics/gamePlanService';
import { cn } from '@/lib/utils';
import { AnalyticsTable, AnalyticsHeading } from './shared';
import { CheckCircle2, Target, TrendingUp, AlertCircle } from 'lucide-react';

/**
 * GamePlan - Shows what you need to do to hit your target
 *
 * Actionable, easy-to-understand game plan with:
 * - Progress to goal (using REAL user targets from database)
 * - Multiple path options
 * - Smart recommendations
 * - What-if scenarios
 * - Proper MTD (month-to-date) calculations
 */
export function GamePlan() {
  // Fetch all policies and commissions
  const { raw, isLoading: isAnalyticsLoading } = useAnalyticsData({
    startDate: new Date(2020, 0, 1), // Get all data for filtering
    endDate: new Date(2030, 11, 31),
  });

  // Fetch user's actual targets from database
  const { data: userTargets, isLoading: isTargetsLoading } = useUserTargets();

  // Fetch expenses for MTD calculation
  const { data: allExpenses, isLoading: isExpensesLoading } = useExpenses();

  const isLoading = isAnalyticsLoading || isTargetsLoading || isExpensesLoading;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Game Plan
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate MTD expenses (current month only)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const mtdExpenses = (allExpenses || [])
    .filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate game plan using REAL data
  const gamePlan = gamePlanService.calculateGamePlan(
    raw.policies,
    raw.commissions,
    userTargets || null,
    mtdExpenses
  );

  // Calculate annual progress
  const annualProgress = gamePlanService.calculateAnnualProgress(
    raw.policies,
    raw.commissions,
    userTargets || null
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Helper functions for Smart Moves
  const getMoveIcon = (icon: string) => {
    switch (icon) {
      case 'target': return <Target className="h-3 w-3" />;
      case 'trending': return <TrendingUp className="h-3 w-3" />;
      case 'alert': return <AlertCircle className="h-3 w-3" />;
      default: return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-2">
        <AnalyticsHeading
          title="Game Plan"
          subtitle={`${gamePlan.currentMonth} • ${gamePlan.daysRemainingInMonth}d left`}
        />

        {/* Monthly Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">Monthly Goal Progress</span>
            <span className="text-[10px] font-bold font-mono">
              {Math.round(gamePlan.progressPercent)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                gamePlan.progressPercent >= 100 ? "bg-green-600 dark:bg-green-400" :
                gamePlan.progressPercent >= 75 ? "bg-amber-600 dark:bg-amber-400" :
                "bg-red-600 dark:bg-red-400"
              )}
              style={{ width: `${Math.min(100, gamePlan.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Compact Monthly Stats Grid */}
        <div className="grid grid-cols-4 gap-1 mb-2 text-[10px]">
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">MTD</div>
            <div className="font-bold font-mono">{formatCurrency(gamePlan.mtdCommissions)}</div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Goal</div>
            <div className="font-bold font-mono">{formatCurrency(gamePlan.grossCommissionNeeded)}</div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Gap</div>
            <div className={cn(
              "font-bold font-mono",
              gamePlan.gap > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
              {formatCurrency(Math.abs(gamePlan.gap))}
            </div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Days</div>
            <div className="font-bold font-mono">{gamePlan.daysRemainingInMonth}</div>
          </div>
        </div>

        {/* Annual Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-muted-foreground">Annual Goal Progress</span>
            <span className="text-[10px] font-bold font-mono">
              {Math.round(annualProgress.progressPercent)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                annualProgress.onTrackForYear
                  ? "bg-green-600 dark:bg-green-400"
                  : "bg-amber-600 dark:bg-amber-400"
              )}
              style={{ width: `${Math.min(100, annualProgress.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Compact Annual Stats */}
        <div className="grid grid-cols-4 gap-1 mb-2 text-[10px]">
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">YTD</div>
            <div className="font-bold font-mono text-green-600 dark:text-green-400">
              {formatCurrency(annualProgress.ytdCommissions)}
            </div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Annual</div>
            <div className="font-bold font-mono">{formatCurrency(annualProgress.annualGoal)}</div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Need</div>
            <div className="font-bold font-mono text-red-600 dark:text-red-400">
              {formatCurrency(annualProgress.remainingNeeded)}
            </div>
          </div>
          <div className="p-1 bg-muted/30 rounded text-center">
            <div className="text-muted-foreground/70">Months</div>
            <div className="font-bold font-mono">{annualProgress.monthsRemaining}</div>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 gap-1 p-1.5 bg-primary/5 rounded border border-primary/20 mb-2">
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground">Monthly Avg Needed</div>
            <div className="text-xs font-bold font-mono text-primary">
              {formatCurrency(annualProgress.avgMonthlyNeeded)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground">Policies/Month</div>
            <div className="text-xs font-bold font-mono text-primary">
              ~{annualProgress.policiesNeededPerMonth}
            </div>
          </div>
        </div>

        {/* Smart Moves Section */}
        {gamePlan.smartMoves && gamePlan.smartMoves.length > 0 && (
          <>
            <AnalyticsHeading title="Smart Moves" className="mb-1" />
            <AnalyticsTable
              columns={[
                {
                  key: 'icon',
                  header: '',
                  render: (value: string, row: any) => (
                    <div className={getUrgencyColor(row.urgency)}>
                      {getMoveIcon(value)}
                    </div>
                  ),
                  className: 'w-6'
                },
                {
                  key: 'title',
                  header: 'Action',
                  render: (value: string) => (
                    <span className="font-medium">{value}</span>
                  )
                },
                {
                  key: 'description',
                  header: 'Details',
                  render: (value: string) => (
                    <span className="text-[9px] text-muted-foreground">{value}</span>
                  )
                },
                {
                  key: 'urgency',
                  header: 'Priority',
                  align: 'right' as const,
                  render: (value: string) => (
                    <span className={cn(
                      "text-[9px] font-medium uppercase",
                      getUrgencyColor(value)
                    )}>
                      {value}
                    </span>
                  )
                }
              ]}
              data={gamePlan.smartMoves.slice(0, 3)}
              className="mb-2"
            />
          </>
        )}

        {/* What-If Scenarios */}
        {gamePlan.scenarios && gamePlan.scenarios.length > 0 && (
          <>
            <AnalyticsHeading title="What If Scenarios" className="mb-1" />
            <AnalyticsTable
              columns={[
                {
                  key: 'condition',
                  header: 'Scenario',
                  render: (value: string) => (
                    <span className="text-[10px]">{value}</span>
                  )
                },
                {
                  key: 'projectedEarnings',
                  header: 'Projected',
                  align: 'right' as const,
                  render: (value: number) => formatCurrency(value),
                  className: 'font-mono text-[10px]'
                },
                {
                  key: 'goalPercent',
                  header: 'Goal %',
                  align: 'right' as const,
                  render: (value: number) => {
                    const isGood = value >= 100;
                    const isClose = value >= 90;
                    return (
                      <span className={cn(
                        "font-mono font-bold text-[10px]",
                        isGood ? "text-green-600 dark:text-green-400" :
                        isClose ? "text-amber-600 dark:text-amber-400" :
                        "text-red-600 dark:text-red-400"
                      )}>
                        {Math.round(value)}%
                      </span>
                    );
                  }
                }
              ]}
              data={gamePlan.scenarios.slice(0, 4)}
              className="mb-2"
            />
          </>
        )}

        {/* Status Footer */}
        <div className={cn(
          "p-1.5 rounded text-center text-[10px] font-medium",
          gamePlan.gap > 0
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
        )}>
          {gamePlan.gap > 0
            ? `Need ${formatCurrency(gamePlan.gap)} more to hit goal`
            : "Goal Achieved! Keep going!"
          }
        </div>
      </CardContent>
    </Card>
  );
}
