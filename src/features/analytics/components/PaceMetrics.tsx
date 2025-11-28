// src/features/analytics/components/PaceMetrics.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, DollarSign, CheckCircle2 } from 'lucide-react';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { useMetricsWithDateRange } from '@/hooks/kpi/useMetricsWithDateRange';
import { cn } from '@/lib/utils';

/**
 * PaceMetrics - Shows what you need to do to hit your goals
 *
 * CRITICAL: This component now uses useMetricsWithDateRange (same as dashboard)
 * to ensure calculations are consistent across the entire app.
 *
 * Simple, actionable metrics:
 * - Are you profitable or behind?
 * - How many policies do you need to write?
 * - What's your daily/weekly/monthly target?
 * - How much time is left?
 */
export function PaceMetrics() {
  const { dateRange, timePeriod } = useAnalyticsDateRange();

  // Map analytics time period to dashboard time period for useMetricsWithDateRange
  // Default to 'monthly' for most cases
  const dashboardTimePeriod = (() => {
    switch (timePeriod) {
      case 'MTD':
      case 'L30':
        return 'monthly' as const;
      case 'YTD':
      case 'L12M':
        return 'yearly' as const;
      case 'L7':
        return 'weekly' as const;
      case 'L60':
      case 'L90':
      case 'CUSTOM':
      default:
        return 'monthly' as const;
    }
  })();

  // USE THE SAME HOOK AS THE DASHBOARD - Single source of truth!
  const metrics = useMetricsWithDateRange({
    timePeriod: dashboardTimePeriod,
    periodOffset: 0,
  });

  if (metrics.isLoading) {
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

  // Extract the data from the SAME calculations as dashboard
  const { periodAnalytics, periodPolicies, periodCommissions } = metrics;
  const { surplusDeficit, breakevenNeeded, policiesNeeded, netIncome } = periodAnalytics;
  const isProfitable = surplusDeficit >= 0;

  // Calculate time remaining based on selected period
  const now = new Date();
  const msRemaining = dateRange.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.floor(msRemaining / (24 * 60 * 60 * 1000)));

  // Calculate days elapsed in period
  const msElapsed = now.getTime() - dateRange.startDate.getTime();
  const daysElapsed = Math.max(1, Math.floor(msElapsed / (24 * 60 * 60 * 1000)));
  const totalDaysInPeriod = daysElapsed + daysRemaining;

  // Calculate current pace and projections
  const currentAPPace = periodPolicies.premiumWritten / daysElapsed; // AP per day currently
  const projectedAPTotal = currentAPPace * totalDaysInPeriod; // Projected total AP by period end

  const currentPolicyPace = periodPolicies.newCount / daysElapsed; // Policies per day currently
  const projectedPolicyTotal = Math.round(currentPolicyPace * totalDaysInPeriod); // Projected total policies

  // Calculate pace targets (what's needed to break even)
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

  // Debug logging to verify we're using same calculations as dashboard
  console.log('[PaceMetrics] Using useMetricsWithDateRange (same as dashboard):', {
    surplusDeficit,
    netIncome,
    breakevenNeeded,
    policiesNeeded,
    isProfitable,
    commissionPaid: periodCommissions.paid,
    totalExpenses: metrics.periodExpenses.total,
  });

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header with Status */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Pace Metrics
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {getTimePeriodLabel()}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            isProfitable ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {isProfitable ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            <span className="text-xs font-semibold">
              {isProfitable ? "Profitable" : "Deficit"}
            </span>
          </div>
        </div>

        {/* Unified Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current AP Pace (Projection Highlight) */}
          <div className="col-span-2 p-4 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/40">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Projected AP (at current pace)
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold font-mono text-foreground mb-1">
              {formatCurrency(projectedAPTotal)}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Written: {formatCurrency(periodPolicies.premiumWritten)}</span>
              <span>•</span>
              <span>Daily pace: {formatCurrency(currentAPPace)}</span>
              <span>•</span>
              <span>{daysRemaining}d remaining</span>
            </div>
          </div>

          {/* AP Written So Far */}
          <div className="p-3 bg-gradient-to-br from-success/15 to-success/5 rounded-lg border border-success/20">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              AP Written
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(periodPolicies.premiumWritten)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {periodPolicies.newCount} policies • {daysElapsed}d elapsed
            </div>
          </div>

          {/* Projected Policies by Period End */}
          <div className="p-3 bg-gradient-to-br from-info/15 to-info/5 rounded-lg border border-info/20">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Projected Policies
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {projectedPolicyTotal}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {currentPolicyPace.toFixed(1)} per day pace
            </div>
          </div>

          {/* Average AP per Policy */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Avg AP
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {formatCurrency(periodPolicies.averagePremium)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              per policy
            </div>
          </div>

          {/* Breakeven Status */}
          <div className={cn(
            "p-3 rounded-lg border",
            isProfitable
              ? "bg-success/15 border-success/30"
              : "bg-destructive/15 border-destructive/30"
          )}>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {isProfitable ? "Surplus" : "Deficit"}
            </div>
            <div className={cn(
              "text-xl font-bold font-mono",
              isProfitable ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(Math.abs(netIncome))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {isProfitable ? "ahead" : `${formatNumber(dailyTarget)}/day needed`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
