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

/**
 * Format a date and time for display
 * @param date Date to format
 * @returns Formatted date-time string (e.g., "Jan 15, 10:30 AM")
 *
 * IMPORTANT: Uses parseLocalDate to avoid UTC timezone shifting bugs
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Abbreviate large numbers with K, M, B suffixes
 * @param value Number to abbreviate
 * @returns Abbreviated string (e.g., "1.2K", "3.5M")
 *
 * @example
 * abbreviateNumber(1234) // "1.2K"
 * abbreviateNumber(1234567) // "1.2M"
 * abbreviateNumber(1234567890) // "1.2B"
 */
export function abbreviateNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format product type string (convert snake_case to Title Case)
 * @param productType Product type string (e.g., "term_life")
 * @returns Formatted string (e.g., "Term Life")
 *
 * @example
 * formatProductType("term_life") // "Term Life"
 * formatProductType("whole_life") // "Whole Life"
 */
export function formatProductType(productType: string): string {
  return productType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
