// src/features/analytics/components/PaceMetrics.tsx

import React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {useAnalyticsDateRange} from '../context/AnalyticsDateContext';
import {useMetricsWithDateRange} from '@/hooks/kpi/useMetricsWithDateRange';
import {cn} from '@/lib/utils';

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
  const {dateRange, timePeriod} = useAnalyticsDateRange();

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
      <Card>
        <CardContent className="p-3">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Pace Metrics
          </div>
          <div className="p-3 text-center text-[11px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract the data from the SAME calculations as dashboard
  const {periodAnalytics, periodPolicies, periodCommissions} = metrics;
  const {surplusDeficit, breakevenNeeded, policiesNeeded, netIncome} = periodAnalytics;
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
  const _weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
  const _monthlyTarget = Math.ceil(policiesPerDayNeeded * 30);

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
    <Card>
      <CardContent className="p-3">
        {/* Header - matching Targets page pattern */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase">Pace Metrics</div>
            <div className="text-[10px] text-muted-foreground">{getTimePeriodLabel()}</div>
          </div>
          <div className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-medium",
            isProfitable ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}>
            {isProfitable ? "PROFITABLE" : "DEFICIT"}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-1">
          {/* Current Performance Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">AP Written</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{formatCurrency(periodPolicies.premiumWritten)}</span>
              <span className="text-muted-foreground/70">({periodPolicies.newCount} policies)</span>
            </div>
          </div>

          {/* Projected Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Projected AP</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(projectedAPTotal)}</span>
              <span className="text-muted-foreground/70">@ {formatCurrency(currentAPPace)}/day</span>
            </div>
          </div>

          {/* Average Premium Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Average AP</span>
            <span className="font-mono font-bold">{formatCurrency(periodPolicies.averagePremium)}</span>
          </div>

          {/* Projected Policies Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Projected Policies</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{projectedPolicyTotal}</span>
              <span className="text-muted-foreground/70">@ {currentPolicyPace.toFixed(1)}/day</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-800/20 dark:bg-slate-200/10 my-1" />

          {/* Breakeven Status Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground uppercase">{isProfitable ? "Surplus" : "Deficit"}</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-mono font-bold",
                isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(Math.abs(netIncome))}
              </span>
              {!isProfitable && (
                <span className="text-muted-foreground/70">
                  (need {formatNumber(dailyTarget)}/day)
                </span>
              )}
            </div>
          </div>

          {/* Time Remaining Row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Time Left</span>
            <span className="font-mono font-bold">{daysRemaining} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
