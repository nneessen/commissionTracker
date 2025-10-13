// src/types/expense.types.ts

import type { Database } from './database.types';

// Expense type enum
export type ExpenseType = 'personal' | 'business';

// Recurring frequency options
export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually';

/**
 * Main Expense interface matching database schema
 */
export interface Expense {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  amount: number;
  category: string;
  expense_type: ExpenseType;
  date: string; // ISO date string (YYYY-MM-DD)
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  is_tax_deductible: boolean;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to create a new expense
 */
export interface CreateExpenseData {
  name: string;
  description?: string | null;
  amount: number;
  category: string;
  expense_type: ExpenseType;
  date: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency | null;
  is_tax_deductible?: boolean;
  receipt_url?: string | null;
  notes?: string | null;
}

/**
 * Data for updating an existing expense
 */
export interface UpdateExpenseData {
  name?: string;
  description?: string | null;
  amount?: number;
  category?: string;
  expense_type?: ExpenseType;
  date?: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency | null;
  is_tax_deductible?: boolean;
  receipt_url?: string | null;
  notes?: string | null;
}

/**
 * Filter options for querying expenses
 */
export interface ExpenseFilters {
  expenseType?: ExpenseType | 'all';
  category?: string | 'all';
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  recurringOnly?: boolean;
  deductibleOnly?: boolean;
}

/**
 * Summary totals for expenses
 */
export interface ExpenseTotals {
  total: number;
  personal: number;
  business: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

/**
 * Monthly expense breakdown
 */
export interface MonthlyExpenseBreakdown {
  month: string; // YYYY-MM format
  total: number;
  personal: number;
  business: number;
  byCategory: Record<string, number>;
}

/**
 * Yearly expense summary
 */
export interface YearlyExpenseSummary {
  year: number;
  total: number;
  personal: number;
  business: number;
  monthlyBreakdown: MonthlyExpenseBreakdown[];
  byCategory: Record<string, number>;
}

/**
 * Expense Category model for user-defined categories
 */
export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating expense category
 */
export interface CreateExpenseCategoryData {
  name: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Data for updating expense category
 */
export interface UpdateExpenseCategoryData {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Data point for trend charts
 */
export interface ExpenseTrendData {
  month: string; // Format: "Jan 2025"
  personal: number;
  business: number;
  total: number;
}

/**
 * Category breakdown for pie/bar charts
 */
export interface CategoryBreakdownData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

/**
 * Comparison data for business vs personal
 */
export interface ExpenseComparisonData {
  type: 'personal' | 'business';
  amount: number;
  count: number;
  avgAmount: number;
}

/**
 * Advanced filter options with ranges
 */
export interface AdvancedExpenseFilters extends ExpenseFilters {
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Export options for CSV/PDF
 */
export interface ExpenseExportOptions {
  format: 'csv' | 'pdf';
  filters?: AdvancedExpenseFilters;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

/**
 * Default expense categories
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Office Supplies', description: 'Pens, paper, printer ink, etc.' },
  { name: 'Travel', description: 'Transportation, hotels, flights' },
  { name: 'Meals & Entertainment', description: 'Business meals, client entertainment' },
  { name: 'Utilities', description: 'Electricity, water, internet, phone' },
  { name: 'Insurance', description: 'Health, liability, property insurance' },
  { name: 'Marketing', description: 'Advertising, promotional materials' },
  { name: 'Professional Services', description: 'Legal, accounting, consulting' },
  { name: 'Technology', description: 'Software subscriptions, hardware' },
  { name: 'Rent & Lease', description: 'Office space, equipment leases' },
  { name: 'Training & Education', description: 'Courses, conferences, books' },
  { name: 'Vehicle', description: 'Gas, maintenance, registration' },
  { name: 'Other', description: 'Miscellaneous expenses' },
];