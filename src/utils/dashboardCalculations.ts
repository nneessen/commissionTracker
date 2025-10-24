// src/utils/dashboardCalculations.ts

import { TimePeriod, DAYS_PER_PERIOD, getDaysInPeriod } from "./dateRange";

export function scaleToDisplayPeriod(
  monthlyValue: number,
  displayPeriod: TimePeriod,
): number {
  const monthlyDays = DAYS_PER_PERIOD.monthly; // 30.44
  const displayDays = DAYS_PER_PERIOD[displayPeriod];

  // Convert monthly value to daily rate, then to display period
  const dailyRate = monthlyValue / monthlyDays;
  return dailyRate * displayDays;
}

export function scaleCountToDisplayPeriod(
  monthlyCount: number,
  displayPeriod: TimePeriod,
): number {
  return Math.round(scaleToDisplayPeriod(monthlyCount, displayPeriod));
}

export function getPoliciesNeededDisplay(
  paceMetrics: {
    dailyTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
  },
  policiesNeeded: number,
  displayPeriod: TimePeriod,
): number {
  switch (displayPeriod) {
    case "daily":
      return paceMetrics.dailyTarget;
    case "weekly":
      return paceMetrics.weeklyTarget;
    case "monthly":
      return paceMetrics.monthlyTarget;
    case "yearly":
      return policiesNeeded;
    default:
      return paceMetrics.monthlyTarget;
  }
}

export function getPeriodSuffix(period: TimePeriod): string {
  switch (period) {
    case "daily":
      return " Per Day";
    case "weekly":
      return " Per Week";
    case "monthly":
      return " Per Month";
    case "yearly":
      return " Per Year";
    default:
      return " Per Month";
  }
}

export function getBreakevenDisplay(
  breakevenNeeded: number,
  displayPeriod: TimePeriod,
): number {
  return breakevenNeeded;
}

export function calculateDerivedMetrics(
  periodPolicies: {
    lapsed: number;
    cancelled: number;
    newCount: number;
  },
  periodClients: {
    newCount: number;
    totalValue: number;
  },
) {
  const lapsedRate =
    periodPolicies.newCount > 0
      ? (periodPolicies.lapsed / periodPolicies.newCount) * 100
      : 0;

  const cancellationRate =
    periodPolicies.newCount > 0
      ? (periodPolicies.cancelled / periodPolicies.newCount) * 100
      : 0;

  const avgClientValue =
    periodClients.newCount > 0
      ? periodClients.totalValue / periodClients.newCount
      : 0;

  return {
    lapsedRate,
    cancellationRate,
    avgClientValue,
  };
}

export function calculateMonthProgress() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const daysPassed = now.getDate();
  const monthProgress = (daysPassed / daysInMonth) * 100;

  return {
    now,
    startOfMonth,
    daysInMonth,
    daysPassed,
    monthProgress,
  };
}

export function getPerformanceStatus(
  current: number,
  target: number | null | undefined,
  hasTarget: boolean,
): "hit" | "good" | "fair" | "poor" | "neutral" {
  if (!hasTarget || !target || target === 0) {
    return "neutral";
  }

  const pct = (current / target) * 100;

  if (pct >= 100) return "hit";
  if (pct >= 75) return "good";
  if (pct >= 50) return "fair";
  return "poor";
}

export function calculateTargetPercentage(
  current: number,
  target: number | null | undefined,
): number {
  if (!target || target === 0) return 0;
  return (current / target) * 100;
}
