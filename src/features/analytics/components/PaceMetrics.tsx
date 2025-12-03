// src/features/analytics/components/PaceMetrics.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card className="border-border/50">
        <CardContent className="p-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Pace Metrics
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
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

  return (
    <Card className="w-full border-border/50">
      <CardContent className="p-2">
        {/* Compact Header with Status */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-medium text-muted-foreground uppercase">
              Pace Metrics
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              {getTimePeriodLabel()}
            </div>
          </div>
          <div className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium",
            isProfitable ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}>
            {isProfitable ? "PROFITABLE" : "DEFICIT"}
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* Current AP Pace (Projection Highlight) */}
          <div className="col-span-3 p-1.5 bg-muted/5 rounded border border-border/30">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground uppercase">
                Projected AP
              </div>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(projectedAPTotal)}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 mt-0.5">
              <span>Written: {formatCurrency(periodPolicies.premiumWritten)}</span>
              <span>•</span>
              <span>Pace: {formatCurrency(currentAPPace)}/day</span>
              <span>•</span>
              <span>{daysRemaining}d left</span>
            </div>
          </div>

          {/* AP Written */}
          <div className="p-1.5 bg-card rounded border border-border/30">
            <div className="text-[9px] text-muted-foreground uppercase">
              AP Written
            </div>
            <div className="text-sm font-bold font-mono">
              {formatCurrency(periodPolicies.premiumWritten)}
            </div>
            <div className="text-[9px] text-muted-foreground/70">
              {periodPolicies.newCount} policies
            </div>
          </div>

          {/* Projected Policies */}
          <div className="p-1.5 bg-card rounded border border-border/30">
            <div className="text-[9px] text-muted-foreground uppercase">
              Proj. Policies
            </div>
            <div className="text-sm font-bold font-mono">
              {projectedPolicyTotal}
            </div>
            <div className="text-[9px] text-muted-foreground/70">
              {currentPolicyPace.toFixed(1)}/day
            </div>
          </div>

          {/* Average AP */}
          <div className="p-1.5 bg-card rounded border border-border/30">
            <div className="text-[9px] text-muted-foreground uppercase">
              Avg AP
            </div>
            <div className="text-sm font-bold font-mono">
              {formatCurrency(periodPolicies.averagePremium)}
            </div>
            <div className="text-[9px] text-muted-foreground/70">
              per policy
            </div>
          </div>

          {/* Breakeven Status - Full Width */}
          <div className={cn(
            "col-span-3 p-1.5 rounded border",
            isProfitable
              ? "bg-green-500/5 border-green-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground uppercase">
                {isProfitable ? "Current Surplus" : "Current Deficit"}
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "text-sm font-bold font-mono",
                  isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(Math.abs(netIncome))}
                </div>
                {!isProfitable && (
                  <div className="text-[10px] text-muted-foreground">
                    ({formatNumber(dailyTarget)}/day needed)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
