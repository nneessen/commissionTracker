// src/lib/format.ts

import { parseLocalDate, formatDateForDisplay } from './date';

/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string or Date object for display
 *
 * IMPORTANT: Uses parseLocalDate to avoid UTC timezone shifting bugs
 * (e.g., "2025-10-01" staying as Oct 1, not becoming Sept 30)
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatDateForDisplay(date, options);
}

/**
 * Format a date as month and year (e.g., "January 2025")
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format a number as a percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
