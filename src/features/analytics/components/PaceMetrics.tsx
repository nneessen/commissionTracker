// src/features/analytics/components/PaceMetrics.tsx

import React from "react";
import { useAnalyticsDateRange } from "../context/AnalyticsDateContext";
import { useAnalyticsData } from "@/hooks";
import { cn } from "@/lib/utils";

/**
 * PaceMetrics - Shows pace and projection metrics for the selected analytics period
 *
 * Uses useAnalyticsData filtered by the analytics date context so metrics
 * update when the user switches time periods.
 */
export function PaceMetrics() {
  const { dateRange, timePeriod } = useAnalyticsDateRange();

  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
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

  const { policies, commissions, expenses } = raw;

  // Derive pace calculations from filtered data
  const premiumWritten = policies.reduce(
    (sum, p) => sum + (p.annualPremium ?? 0),
    0,
  );
  const policyCount = policies.length;
  const averagePremium = policyCount > 0 ? premiumWritten / policyCount : 0;

  const totalCommissions = commissions.reduce(
    (sum, c) => sum + (c.amount ?? 0),
    0,
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const netIncome = totalCommissions - totalExpenses;
  const surplusDeficit = netIncome;
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
  const daysElapsed = Math.max(
    1,
    Math.ceil(msElapsed / (24 * 60 * 60 * 1000)),
  );

  // Total days in period
  const totalDaysInPeriod = Math.ceil(
    (dateRange.actualEndDate.getTime() - dateRange.startDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  // Pace projections
  const currentAPPace = premiumWritten / daysElapsed;
  const projectedAPTotal = currentAPPace * totalDaysInPeriod;
  const currentPolicyPace = policyCount / daysElapsed;
  const projectedPolicyTotal = Math.round(
    currentPolicyPace * totalDaysInPeriod,
  );

  // Breakeven target (rough estimate: need enough commissions to cover expenses)
  const totalDaysRemaining = daysRemaining + hoursRemaining / 24;
  const deficitAmount = Math.max(0, -surplusDeficit);
  const policiesNeeded =
    averagePremium > 0 ? Math.ceil(deficitAmount / (averagePremium * 0.5)) : 0;
  const dailyTarget =
    policiesNeeded > 0 && totalDaysRemaining > 0
      ? Math.ceil(policiesNeeded / totalDaysRemaining)
      : 0;

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
      {/* Header */}
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
        {/* AP Written */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">AP Written</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(premiumWritten)}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              ({policyCount} policies)
            </span>
          </div>
        </div>

        {/* Projected AP */}
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

        {/* Average Premium */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">Average AP</span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(averagePremium)}
          </span>
        </div>

        {/* Projected Policies */}
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

        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

        {/* Surplus/Deficit */}
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

        {/* Time Remaining */}
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
