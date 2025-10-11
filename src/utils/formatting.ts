// src/utils/formatting.ts

/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, percentages, and numbers.
 * Used across the application for consistent display formatting.
 */

/**
 * Format a number as US currency
 * @param value Number to format
 * @param options Optional Intl.NumberFormatOptions
 * @returns Formatted currency string (e.g., "$1,234")
 *
 * @example
 * formatCurrency(1234.56) // "$1,235"
 * formatCurrency(1234.56, { minimumFractionDigits: 2 }) // "$1,234.56"
 */
export function formatCurrency(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  };

  return `$${value.toLocaleString('en-US', defaultOptions)}`;
}

/**
 * Format a number as a percentage
 * @param value Number to format (as decimal, e.g., 0.85 for 85%)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "85.0%")
 *
 * @example
 * formatPercent(0.856) // "85.6%"
 * formatPercent(0.856, 0) // "86%"
 * formatPercent(0.856, 2) // "85.60%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with optional decimal places
 * @param value Number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234.5678) // "1234.6"
 * formatNumber(1234.5678, 0) // "1235"
 * formatNumber(1234.5678, 2) // "1234.57"
 */
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

/**
 * Format a number with thousands separators
 * @param value Number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted number string with commas
 *
 * @example
 * formatNumberWithCommas(1234567) // "1,234,567"
 * formatNumberWithCommas(1234.567, 2) // "1,234.57"
 */
export function formatNumberWithCommas(
  value: number,
  decimals: number = 0
): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a date for display
 * @param date Date to format
 * @param options Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date()) // "Jan 15, 2025"
 * formatDate(new Date(), { month: 'long' }) // "January 15, 2025"
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };

  return dateObj.toLocaleString('en-US', defaultOptions);
}

/**
 * Format a date and time for display
 * @param date Date to format
 * @returns Formatted date-time string (e.g., "Jan 15, 10:30 AM")
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
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
