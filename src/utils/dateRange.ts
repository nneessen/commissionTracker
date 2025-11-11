// src/utils/dateRange.ts

import { parseLocalDate } from '../lib/date';

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get the date range for a given time period
 * @param period The time period to get the range for
 * @returns DateRange with start and end dates
 */
export function getDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  let endDate = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      // Today from 00:00:00 to now
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;

    case 'weekly':
      // Last 7 days from now
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      break;

    case 'monthly':
      // Entire current month from 1st at 00:00:00 to last day at 23:59:59
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'yearly':
      // Year-to-date from Jan 1 at 00:00:00 to now
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    default:
      // Default to monthly - entire current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

/**
 * Check if a date falls within a date range
 * @param date The date to check
 * @param range The date range to check against
 * @returns boolean indicating if date is in range
 *
 * IMPORTANT: Uses parseLocalDate to avoid UTC timezone shifting bugs
 * (e.g., "2025-10-01" stays as Oct 1, not becoming Sept 30)
 */
export function isInDateRange(date: Date | string, range: DateRange): boolean {
  const checkDate = typeof date === 'string' ? parseLocalDate(date) : date;
  return checkDate >= range.startDate && checkDate <= range.endDate;
}

/**
 * Get the number of days in a time period
 * @param period The time period
 * @returns Number of days in the period
 */
export function getDaysInPeriod(period: TimePeriod): number {
  const range = getDateRange(period);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / msPerDay);
}

/**
 * Get the time remaining in a period
 * @param period The time period
 * @returns Object with days and hours remaining
 */
export function getTimeRemaining(period: TimePeriod): { days: number; hours: number } {
  const now = new Date();
  let endOfPeriod: Date;

  switch (period) {
    case 'daily':
      // End of today
      endOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case 'weekly':
      // 7 days from start of period
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      endOfPeriod = new Date(weekStart);
      endOfPeriod.setDate(endOfPeriod.getDate() + 7);
      break;

    case 'monthly':
      // End of current month
      endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'yearly':
      // End of current year
      endOfPeriod = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    default:
      endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const msRemaining = endOfPeriod.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return {
    days: Math.max(0, daysRemaining),
    hours: Math.max(0, hoursRemaining)
  };
}

/**
 * Get a human-readable label for the time period
 * @param period The time period
 * @returns Formatted label string
 */
export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'yearly':
      return 'Yearly';
    default:
      return 'Monthly';
  }
}

/**
 * Format a date range for display
 * @param range The date range to format
 * @returns Formatted string representation
 */
export function formatDateRange(range: DateRange): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  const start = range.startDate.toLocaleDateString('en-US', formatOptions);
  const end = range.endDate.toLocaleDateString('en-US', formatOptions);

  // If same day, just show one date
  if (start === end) {
    return start;
  }

  // If same year, don't repeat the year
  if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
    const startNoYear = range.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startNoYear} - ${end}`;
  }

  return `${start} - ${end}`;
}

/**
 * Average number of days in each time period
 * Used for scaling metrics across different time periods
 */
export const DAYS_PER_PERIOD: Record<TimePeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30.44,  // Average month length (365.25 / 12)
  yearly: 365.25   // Account for leap years
};

/**
 * Scale a metric value from one time period to another
 * @param value The value to scale
 * @param fromPeriod The original time period
 * @param toPeriod The target time period
 * @returns Scaled value
 */
export function scaleMetricByPeriod(
  value: number,
  fromPeriod: TimePeriod,
  toPeriod: TimePeriod
): number {
  const fromDays = DAYS_PER_PERIOD[fromPeriod];
  const toDays = DAYS_PER_PERIOD[toPeriod];
  return (value / fromDays) * toDays;
}

/**
 * Get the average value per display period based on actual data in a date range
 * This is the KEY function for fixing the time period scaling bug.
 *
 * Example: If you have $4,000 in expenses over 30 days and want to show "Weekly":
 * - Daily average = $4,000 / 30 = $133.33/day
 * - Weekly average = $133.33 * 7 = $933.33/week
 *
 * @param totalValue The total value across the entire date range
 * @param dateRange The date range the total covers
 * @param displayPeriod The time period to display the average for
 * @returns Average value per display period
 */
export function getAveragePeriodValue(
  totalValue: number,
  dateRange: DateRange,
  displayPeriod: TimePeriod
): number {
  // Calculate number of days in the actual date range
  const msPerDay = 24 * 60 * 60 * 1000;
  const rangeDays = Math.max(1, Math.ceil(
    (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / msPerDay
  ));

  // Calculate daily average from the total
  const dailyAverage = totalValue / rangeDays;

  // Scale to the display period
  const periodDays = DAYS_PER_PERIOD[displayPeriod];

  return dailyAverage * periodDays;
}