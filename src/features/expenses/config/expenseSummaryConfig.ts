// src/features/expenses/config/expenseSummaryConfig.ts

import type { Expense } from '../../../types/expense.types';
import { EXPENSE_STATUS_COLORS } from './expenseDashboardConfig';

/**
 * Summary metric configuration
 */
export interface SummaryMetric {
  label: string;
  value: string | number;
  variant?: 'highlight' | 'default';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * Calculate summary metrics from expenses
 */
export function calculateSummaryMetrics(
  expenses: Expense[],
  previousMonthExpenses: Expense[] = []
): {
  total: number;
  business: number;
  personal: number;
  deductible: number;
  count: number;
  momGrowth: number;
} {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const business = expenses
    .filter((e) => e.expense_type === 'business')
    .reduce((sum, e) => sum + e.amount, 0);
  const personal = expenses
    .filter((e) => e.expense_type === 'personal')
    .reduce((sum, e) => sum + e.amount, 0);
  const deductible = expenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;

  // Calculate Month-over-Month growth
  const previousTotal = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const momGrowth =
    previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

  return {
    total,
    business,
    personal,
    deductible,
    count,
    momGrowth,
  };
}

/**
 * Get color for MoM growth (expenses: negative growth is good!)
 */
export function getMomGrowthColor(growthPercentage: number): string {
  if (growthPercentage < 0) return EXPENSE_STATUS_COLORS.positive; // Spending decreased
  if (growthPercentage === 0) return EXPENSE_STATUS_COLORS.muted; // No change
  if (growthPercentage < 10) return EXPENSE_STATUS_COLORS.warning; // Slight increase
  return EXPENSE_STATUS_COLORS.negative; // Significant increase
}

/**
 * Format MoM growth for display
 */
export function formatMomGrowth(growthPercentage: number): string {
  const arrow = growthPercentage > 0 ? '▲' : growthPercentage < 0 ? '▼' : '—';
  const value = Math.abs(growthPercentage).toFixed(1);
  return `${arrow} ${value}% MoM`;
}
