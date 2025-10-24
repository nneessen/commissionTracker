// src/utils/formatters.ts

/**
 * Format currency with proper locale and decimal places
 */
export const formatCurrency = (
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string => {
  if (value === null || value === undefined) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  }).format(value);
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (
  value: number | null | undefined,
  decimals = 0
): string => {
  if (value === null || value === undefined) return "0";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (
  value: number | null | undefined,
  decimals = 1
): string => {
  if (value === null || value === undefined) return "0%";

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Format date to locale string
 */
export const formatDate = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  }).format(dateObj);
};

/**
 * Format compact number (e.g., 1.2K, 3.4M)
 */
export const formatCompact = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined) return "0";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
};