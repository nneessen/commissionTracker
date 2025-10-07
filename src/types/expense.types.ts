// src/types/expense.types.ts

import type { Database } from './database.types';

// DB-aligned types
export type ExpenseType = 'personal' | 'business';
export type ExpenseCategory = Database['public']['Enums']['expense_category'];

/**
 * Main Expense interface matching ACTUAL database schema
 */
export interface Expense {
  id: string;
  user_id: string;
  name: string;
  description: string;
  amount: number;
  category: string; // DB has TEXT not ENUM currently
  expense_type: ExpenseType;
  date: string; // ISO date string - DB column is named 'date' not 'expense_date'
  is_recurring: boolean;
  recurring_frequency: string | null;
  receipt_url: string | null;
  is_deductible: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to create a new expense
 */
export interface CreateExpenseData {
  name: string;
  description: string;
  amount: number;
  category: string;
  expense_type: ExpenseType;
  date: string; // ISO date string
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  receipt_url?: string | null;
  is_deductible?: boolean;
  notes?: string | null;
}

/**
 * Data for updating an existing expense
 */
export interface UpdateExpenseData {
  name?: string;
  description?: string;
  amount?: number;
  category?: string;
  expense_type?: ExpenseType;
  date?: string;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  receipt_url?: string | null;
  is_deductible?: boolean;
  notes?: string | null;
}

/**
 * Summary totals for expenses
 */
export interface ExpenseTotals {
  personal: number;
  business: number;
  deductible: number;
  total: number;
  monthlyTotal: number;
}

/**
 * Monthly breakdown by category
 */
export interface MonthlyExpenseBreakdown {
  totalExpenses: number;
  categoryBreakdown: Record<string, number>;
  businessExpenses: number;
  personalExpenses: number;
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
  deductibleOnly?: boolean;
}

/**
 * Expense Category Model for customizable user-defined categories
 */
export interface ExpenseCategoryModel {
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
