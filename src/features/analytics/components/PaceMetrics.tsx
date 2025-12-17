// src/features/analytics/components/PaceMetrics.tsx

import React from "react";
import { useAnalyticsDateRange } from "../context/AnalyticsDateContext";
import { useMetricsWithDateRange } from "@/hooks/kpi/useMetricsWithDateRange";
import { cn } from "@/lib/utils";

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
      case "MTD":
      case "L30":
        return "monthly" as const;
      case "YTD":
      case "L12M":
        return "yearly" as const;
      case "L60":
      case "L90":
      case "CUSTOM":
      default:
        return "monthly" as const;
    }
  })();

  // USE THE SAME HOOK AS THE DASHBOARD - Single source of truth!
  const metrics = useMetricsWithDateRange({
    timePeriod: dashboardTimePeriod,
    periodOffset: 0,
  });

  if (metrics.isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Pace Metrics
        </div>
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  // Extract the data from the SAME calculations as dashboard
  const {
    periodAnalytics,
    periodPolicies,
    periodCommissions: _periodCommissions,
  } = metrics;
  const {
    surplusDeficit,
    breakevenNeeded: _breakevenNeeded,
    policiesNeeded,
    netIncome,
  } = periodAnalytics;
  const isProfitable = surplusDeficit >= 0;

  // Calculate time remaining based on selected period
  const now = new Date();
  const msRemaining = dateRange.actualEndDate.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.floor(msRemaining / (24 * 60 * 60 * 1000)),
  );
  const hoursRemaining = Math.floor(
    (msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );

  // Calculate days elapsed in period
  const msElapsed = now.getTime() - dateRange.startDate.getTime();
  const daysElapsed = Math.max(1, Math.ceil(msElapsed / (24 * 60 * 60 * 1000)));

  // Total days in period (from start to actual end)
  const totalDaysInPeriod = Math.ceil(
    (dateRange.actualEndDate.getTime() - dateRange.startDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  // Calculate current pace and projections
  const currentAPPace = periodPolicies.premiumWritten / daysElapsed; // AP per day currently
  const projectedAPTotal = currentAPPace * totalDaysInPeriod; // Projected total AP by period end

  const currentPolicyPace = periodPolicies.newCount / daysElapsed; // Policies per day currently
  const projectedPolicyTotal = Math.round(
    currentPolicyPace * totalDaysInPeriod,
  ); // Projected total policies

  // Calculate pace targets (what's needed to break even)
  const totalDaysRemaining = daysRemaining + hoursRemaining / 24;
  const policiesPerDayNeeded =
    policiesNeeded > 0 && totalDaysRemaining > 0
      ? policiesNeeded / totalDaysRemaining
      : 0;
  const dailyTarget = Math.ceil(policiesPerDayNeeded);
  const _weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
  const _monthlyTarget = Math.ceil(policiesPerDayNeeded * totalDaysRemaining);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return Math.ceil(value).toLocaleString();
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "MTD":
        return "This Month";
      case "YTD":
        return "This Year";
      case "L30":
        return "Last 30 Days";
      case "L60":
        return "Last 60 Days";
      case "L90":
        return "Last 90 Days";
      case "L12M":
        return "Last 12 Months";
      case "CUSTOM":
        return "Custom Period";
      default:
        return "This Period";
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header - matching Targets page pattern */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Pace Metrics
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {getTimePeriodLabel()}
          </div>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-medium",
            isProfitable
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          {isProfitable ? "PROFITABLE" : "DEFICIT"}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-1">
        {/* Current Performance Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">AP Written</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(periodPolicies.premiumWritten)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              ({periodPolicies.newCount} policies)
            </span>
          </div>
        </div>

        {/* Projected Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Projected AP</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(projectedAPTotal)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              @ {formatCurrency(currentAPPace)}/day
            </span>
          </div>
        </div>

        {/* Average Premium Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Average AP</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(periodPolicies.averagePremium)}
          </span>
        </div>

        {/* Projected Policies Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">
            Projected Policies
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {projectedPolicyTotal}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              @ {currentPolicyPace.toFixed(1)}/day
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

        {/* Breakeven Status Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase">
            {isProfitable ? "Surplus" : "Deficit"}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono font-bold",
                isProfitable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {formatCurrency(Math.abs(netIncome))}
            </span>
            {!isProfitable && (
              <span className="text-zinc-400 dark:text-zinc-500">
                (need {formatNumber(dailyTarget)}/day)
              </span>
            )}
          </div>
        </div>

        {/* Time Remaining Row */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Time Left</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {daysRemaining > 0
              ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
              : `${hoursRemaining} ${hoursRemaining === 1 ? "hour" : "hours"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
