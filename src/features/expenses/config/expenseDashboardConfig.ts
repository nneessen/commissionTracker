// src/features/expenses/config/expenseDashboardConfig.ts

/**
 * Configuration for Expense Dashboard Layout
 *
 * Design Pattern: Hybrid layout (inspired by dashboard + analytics pages)
 * - Full-width header with time period controls
 * - 2-column responsive grid for main content
 * - Full-width table at bottom
 */

export interface ExpenseDashboardLayout {
  gridCols: {
    desktop: string;
    mobile: string;
  };
  gaps: {
    section: string;
    card: string;
  };
  maxWidth: string;
}

export const EXPENSE_DASHBOARD_LAYOUT: ExpenseDashboardLayout = {
  gridCols: {
    desktop: 'grid-cols-1 xl:grid-cols-2',
    mobile: 'grid-cols-1',
  },
  gaps: {
    section: 'gap-6', // Between major sections
    card: 'gap-4', // Between cards in grid
  },
  maxWidth: 'max-w-[1600px]',
};

/**
 * Card styling constants matching dashboard/analytics patterns
 */
export const EXPENSE_CARD_STYLES = {
  header: 'p-4 pb-3',
  content: 'p-4 pt-0',
  title: 'text-sm uppercase tracking-wide',
  label: 'text-xs text-muted-foreground',
  value: 'font-mono font-semibold',
  valueHighlight: 'font-mono font-semibold text-xl',
  sectionHeader: 'text-xs font-semibold text-muted-foreground uppercase tracking-wide',
  spacing: 'space-y-3',
} as const;

/**
 * Gradient backgrounds for different card types
 */
export const EXPENSE_GRADIENTS = {
  summary: 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/35',
  budget: 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/35',
  warning: 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/35',
  danger: 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/35',
  neutral: 'bg-gradient-to-br from-muted/10 to-card',
} as const;

/**
 * Status colors matching semantic usage across app
 */
export const EXPENSE_STATUS_COLORS = {
  positive: 'text-success', // Under budget, good trends
  warning: 'text-warning', // Approaching limits
  negative: 'text-error', // Over budget, bad trends
  info: 'text-info', // Neutral information
  muted: 'text-muted-foreground',
} as const;

/**
 * Budget status thresholds (percentage of budget used)
 */
export const BUDGET_THRESHOLDS = {
  safe: 75, // < 75% = green
  warning: 90, // 75-90% = amber
  danger: 100, // > 90% = red
} as const;

/**
 * Export format options
 */
export const EXPORT_FORMATS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'pdf', label: 'Export PDF' },
] as const;

/**
 * Time period presets matching dashboard pattern
 */
export const TIME_PERIOD_PRESETS = [
  { value: 'mtd', label: 'Month to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_60', label: 'Last 60 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
] as const;
