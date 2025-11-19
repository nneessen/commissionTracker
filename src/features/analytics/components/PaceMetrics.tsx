// src/features/analytics/components/PaceMetrics.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, DollarSign, CheckCircle2 } from 'lucide-react';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { useAnalyticsData } from '../../../hooks/useAnalyticsData';
import { cn } from '@/lib/utils';

/**
 * PaceMetrics - Shows what you need to do to hit your goals
 *
 * Simple, actionable metrics:
 * - Are you profitable or behind?
 * - How many policies do you need to write?
 * - What's your daily/weekly/monthly target?
 * - How much time is left?
 */
export function PaceMetrics() {
  const { dateRange, timePeriod } = useAnalyticsDateRange();
  const analyticsData = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (analyticsData.isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Your Pace Metrics
          </div>
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading pace data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate metrics from raw data
  const { commissions, policies } = analyticsData.raw;

  // Filter data by date range
  const periodCommissions = commissions.filter((c) => {
    const date = new Date(c.createdAt);
    return date >= dateRange.startDate && date <= dateRange.endDate;
  });

  const periodPolicies = policies.filter((p) => {
    const date = new Date(p.effectiveDate);
    return date >= dateRange.startDate && date <= dateRange.endDate;
  });

  // Calculate income and expenses
  const commissionEarned = periodCommissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  // For expenses, we'd need to fetch them - for now, assume zero
  // TODO: Add expenses to analyticsData.raw
  const totalExpenses = 0;

  const netIncome = commissionEarned - totalExpenses;
  const surplusDeficit = netIncome;
  const isProfitable = surplusDeficit >= 0;
  const breakevenNeeded = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;

  // Calculate average commission per policy
  const avgCommissionPerPolicy = periodPolicies.length > 0
    ? commissionEarned / periodPolicies.length
    : 1000; // Fallback estimate

  // Calculate policies needed
  const policiesNeeded = avgCommissionPerPolicy > 0
    ? Math.ceil(breakevenNeeded / avgCommissionPerPolicy)
    : 0;

  // Calculate time remaining
  const now = new Date();
  const msRemaining = dateRange.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.floor(msRemaining / (24 * 60 * 60 * 1000)));
  const hoursRemaining = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  // Calculate pace targets
  const policiesPerDayNeeded = policiesNeeded > 0 ? policiesNeeded / daysRemaining : 0;
  const dailyTarget = Math.ceil(policiesPerDayNeeded);
  const weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
  const monthlyTarget = Math.ceil(policiesPerDayNeeded * 30);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return Math.ceil(value).toLocaleString();
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'MTD': return 'This Month';
      case 'YTD': return 'This Year';
      case 'L30': return 'Last 30 Days';
      case 'L60': return 'Last 60 Days';
      case 'L90': return 'Last 90 Days';
      case 'L12M': return 'Last 12 Months';
      case 'CUSTOM': return 'Custom Period';
      default: return 'This Period';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Your Pace Metrics
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Track your progress and daily goals for {getTimePeriodLabel().toLowerCase()}
          </div>
        </div>

        {/* Status Banner */}
        <div className={cn(
          "p-4 rounded-lg mb-5 border-2 flex items-center justify-between",
          isProfitable
            ? "bg-success/10 border-success/30"
            : "bg-destructive/10 border-destructive/30"
        )}>
          <div className="flex items-center gap-3">
            {isProfitable ? (
              <CheckCircle2 className="h-8 w-8 text-success" />
            ) : (
              <Target className="h-8 w-8 text-destructive" />
            )}
            <div>
              <div className={cn(
                "text-lg font-bold",
                isProfitable ? "text-success" : "text-destructive"
              )}>
                {isProfitable ? "You're Profitable!" : "Need to Catch Up"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isProfitable
                  ? `${formatCurrency(Math.abs(surplusDeficit))} ahead this period`
                  : `${formatCurrency(Math.abs(surplusDeficit))} behind this period`
                }
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">{isProfitable ? '✓' : '!'}</div>
          </div>
        </div>

        {/* Breakeven Section - Only show if behind */}
        {!isProfitable && (
          <div className="mb-5 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              To Break Even
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Money Needed */}
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Need to Earn</div>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {formatCurrency(breakevenNeeded)}
                  </div>
                </div>
              </div>
              {/* Policies Needed */}
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                <div>
                  <div className="text-xs text-muted-foreground">Policies Needed</div>
                  <div className="text-lg font-bold text-foreground font-mono">
                    {formatNumber(policiesNeeded)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Policy Targets Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Daily Target */}
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 shadow-sm">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Daily Target
              </div>
              <div className="text-2xl font-bold text-foreground font-mono mb-1">
                {formatNumber(dailyTarget)}
              </div>
              <div className="text-xs text-muted-foreground">
                policies per day
              </div>
            </CardContent>
          </Card>

          {/* Weekly Target */}
          <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/30 shadow-sm">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Weekly Target
              </div>
              <div className="text-2xl font-bold text-foreground font-mono mb-1">
                {formatNumber(weeklyTarget)}
              </div>
              <div className="text-xs text-muted-foreground">
                policies per week
              </div>
            </CardContent>
          </Card>

          {/* Monthly Target */}
          <Card className="bg-gradient-to-br from-info/20 to-info/5 border-info/30 shadow-sm">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Monthly Target
              </div>
              <div className="text-2xl font-bold text-foreground font-mono mb-1">
                {formatNumber(monthlyTarget)}
              </div>
              <div className="text-xs text-muted-foreground">
                policies per month
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Net Income Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            {isProfitable ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            <div>
              <div className="text-xs text-muted-foreground">Net Income {getTimePeriodLabel()}</div>
              <div className={cn(
                "text-sm font-bold font-mono",
                isProfitable ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(netIncome)}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {isProfitable
              ? "Keep it up! You're on track."
              : `Write ${formatNumber(dailyTarget)} policies/day to catch up`
            }
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-accent/5 rounded-lg text-xs text-muted-foreground">
          <strong className="text-foreground">What this means:</strong>{' '}
          {isProfitable
            ? `Your commission income exceeds your expenses this period. You're ${formatCurrency(Math.abs(surplusDeficit))} ahead!`
            : `To break even, you need to earn ${formatCurrency(breakevenNeeded)} more. That's about ${formatNumber(policiesNeeded)} policies, or ${formatNumber(dailyTarget)} per day.`
          }
        </div>
      </CardContent>
    </Card>
  );
}
