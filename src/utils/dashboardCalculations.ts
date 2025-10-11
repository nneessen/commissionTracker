// src/utils/dashboardCalculations.ts

/**
 * Dashboard Calculation Utilities
 *
 * All calculation helper functions for dashboard metrics.
 * These were previously inline in DashboardHome.tsx.
 */

import { TimePeriod, DAYS_PER_PERIOD, getDaysInPeriod } from './dateRange';

/**
 * Scale a monthly value to a display period
 * Takes a monthly value and converts it to daily/weekly/monthly/yearly
 *
 * @param monthlyValue The value from monthly data
 * @param displayPeriod The period to display (daily, weekly, monthly, yearly)
 * @returns Scaled value for the display period
 *
 * @example
 * scaleToDisplayPeriod(3000, 'weekly') // 3000 / 30.44 * 7 = 692
 * scaleToDisplayPeriod(3000, 'yearly') // 3000 * 12 = 36000
 */
export function scaleToDisplayPeriod(
  monthlyValue: number,
  displayPeriod: TimePeriod
): number {
  const monthlyDays = DAYS_PER_PERIOD.monthly; // 30.44
  const displayDays = DAYS_PER_PERIOD[displayPeriod];

  // Convert monthly value to daily rate, then to display period
  const dailyRate = monthlyValue / monthlyDays;
  return dailyRate * displayDays;
}

/**
 * Scale a count/integer value to the display period
 * Uses the same logic as scaleToDisplayPeriod but rounds to nearest integer
 *
 * @param monthlyCount The count from monthly data
 * @param displayPeriod The period to display
 * @returns Rounded integer count for the display period
 *
 * @example
 * scaleCountToDisplayPeriod(30, 'weekly') // Math.round(30 / 30.44 * 7) = 7
 */
export function scaleCountToDisplayPeriod(
  monthlyCount: number,
  displayPeriod: TimePeriod
): number {
  return Math.round(scaleToDisplayPeriod(monthlyCount, displayPeriod));
}

/**
 * Get the appropriate policies needed value based on selected timeframe
 * This breaks down large goals into manageable per-period targets
 *
 * @param paceMetrics Object containing pace metrics (dailyTarget, weeklyTarget, etc.)
 * @param policiesNeeded Yearly policies needed
 * @param displayPeriod The time period to display
 * @returns Policies needed for the display period
 */
export function getPoliciesNeededDisplay(
  paceMetrics: {
    dailyTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
  },
  policiesNeeded: number,
  displayPeriod: TimePeriod
): number {
  switch (displayPeriod) {
    case 'daily':
      return paceMetrics.dailyTarget;
    case 'weekly':
      return paceMetrics.weeklyTarget;
    case 'monthly':
      return paceMetrics.monthlyTarget;
    case 'yearly':
      return policiesNeeded;
    default:
      return paceMetrics.monthlyTarget;
  }
}

/**
 * Get the timeframe-appropriate label suffix for metrics
 *
 * @param period The time period
 * @returns Formatted suffix string (e.g., " Per Day", " Per Week")
 *
 * @example
 * getPeriodSuffix('daily') // " Per Day"
 * getPeriodSuffix('monthly') // " Per Month"
 */
export function getPeriodSuffix(period: TimePeriod): string {
  switch (period) {
    case 'daily':
      return ' Per Day';
    case 'weekly':
      return ' Per Week';
    case 'monthly':
      return ' Per Month';
    case 'yearly':
      return ' Per Year';
    default:
      return ' Per Month';
  }
}

/**
 * Scale the breakeven amount to the selected display period
 * This shows how much needs to be earned per day/week/month/year
 *
 * @param breakevenNeeded Total breakeven amount needed
 * @param displayPeriod The time period to display
 * @returns Breakeven amount scaled to display period
 *
 * @example
 * getBreakevenDisplay(1000, 'daily') // 1000 / 30 = 33.33
 * getBreakevenDisplay(1000, 'yearly') // 1000 * 12 = 12000
 */
export function getBreakevenDisplay(
  breakevenNeeded: number,
  displayPeriod: TimePeriod
): number {
  const daysInRange = getDaysInPeriod(displayPeriod);
  const dailyBreakeven = breakevenNeeded / Math.max(1, daysInRange);
  return dailyBreakeven * DAYS_PER_PERIOD[displayPeriod];
}

/**
 * Calculate derived metrics from period data
 *
 * @param periodPolicies Policies data for the period
 * @param periodClients Clients data for the period
 * @returns Object containing calculated metrics
 */
export function calculateDerivedMetrics(
  periodPolicies: {
    lapsed: number;
    cancelled: number;
    newCount: number;
  },
  periodClients: {
    newCount: number;
    totalValue: number;
  }
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

/**
 * Calculate month progress
 *
 * @returns Object with month progress data
 */
export function calculateMonthProgress() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
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

/**
 * Determine performance status based on percentage of target
 *
 * @param current Current value
 * @param target Target value
 * @returns Status string ('hit' | 'good' | 'fair' | 'poor' | 'neutral')
 */
export function getPerformanceStatus(
  current: number,
  target: number | null | undefined,
  hasTarget: boolean
): 'hit' | 'good' | 'fair' | 'poor' | 'neutral' {
  if (!hasTarget || !target || target === 0) {
    return 'neutral';
  }

  const pct = (current / target) * 100;

  if (pct >= 100) return 'hit';
  if (pct >= 75) return 'good';
  if (pct >= 50) return 'fair';
  return 'poor';
}

/**
 * Calculate percentage of target achieved
 *
 * @param current Current value
 * @param target Target value
 * @returns Percentage (0-100+)
 */
export function calculateTargetPercentage(
  current: number,
  target: number | null | undefined
): number {
  if (!target || target === 0) return 0;
  return (current / target) * 100;
}
