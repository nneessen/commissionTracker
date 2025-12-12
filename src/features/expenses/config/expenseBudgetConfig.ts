// src/features/expenses/config/expenseBudgetConfig.ts

import {BUDGET_THRESHOLDS, EXPENSE_STATUS_COLORS} from './expenseDashboardConfig';

/**
 * Budget configuration and calculations
 */

export interface BudgetData {
  monthlyLimit: number;
  yearlyLimit: number;
  businessLimit: number;
  personalLimit: number;
}

export interface BudgetStatus {
  type: 'monthly' | 'yearly' | 'business' | 'personal';
  label: string;
  actual: number;
  budget: number;
  percentage: number;
  remaining: number;
  status: 'safe' | 'warning' | 'danger';
  color: string;
}

/**
 * Calculate budget status for a given type
 */
export function calculateBudgetStatus(
  type: 'monthly' | 'yearly' | 'business' | 'personal',
  actual: number,
  budget: number
): BudgetStatus {
  const percentage = budget > 0 ? (actual / budget) * 100 : 0;
  const remaining = Math.max(0, budget - actual);

  let status: 'safe' | 'warning' | 'danger';
  let color: string;

  if (percentage < BUDGET_THRESHOLDS.safe) {
    status = 'safe';
    color = EXPENSE_STATUS_COLORS.positive;
  } else if (percentage < BUDGET_THRESHOLDS.warning) {
    status = 'warning';
    color = EXPENSE_STATUS_COLORS.warning;
  } else {
    status = 'danger';
    color = EXPENSE_STATUS_COLORS.negative;
  }

  const labels = {
    monthly: 'Monthly Budget',
    yearly: 'Yearly Budget',
    business: 'Business Budget',
    personal: 'Personal Budget',
  };

  return {
    type,
    label: labels[type],
    actual,
    budget,
    percentage,
    remaining,
    status,
    color,
  };
}

/**
 * Get all budget statuses
 */
export function getAllBudgetStatuses(
  actualSpending: {
    monthly: number;
    yearly: number;
    business: number;
    personal: number;
  },
  budgets: BudgetData
): BudgetStatus[] {
  return [
    calculateBudgetStatus('monthly', actualSpending.monthly, budgets.monthlyLimit),
    calculateBudgetStatus('yearly', actualSpending.yearly, budgets.yearlyLimit),
    calculateBudgetStatus('business', actualSpending.business, budgets.businessLimit),
    calculateBudgetStatus('personal', actualSpending.personal, budgets.personalLimit),
  ];
}

/**
 * Default budget values (user can configure these)
 */
export const DEFAULT_BUDGETS: BudgetData = {
  monthlyLimit: 5000,
  yearlyLimit: 60000,
  businessLimit: 3000,
  personalLimit: 2000,
};
