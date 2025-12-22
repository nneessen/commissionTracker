// src/types/expense.types.ts

// Expense type enum
export type ExpenseType = "personal" | "business";

// Recurring frequency options
export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "annually";

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
  recurring_group_id: string | null; // UUID linking related recurring expenses
  recurring_end_date: string | null; // Optional end date for recurring series
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
  recurring_group_id?: string | null;
  recurring_end_date?: string | null;
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
  expenseType?: ExpenseType | "all";
  category?: string | "all";
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
  deductible: number;
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
  deductible: number;
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
  deductible: number;
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
  type: "personal" | "business";
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
  format: "csv" | "pdf";
  filters?: AdvancedExpenseFilters;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

/**
 * Expense Template - for quick one-click expense entry
 */
export interface ExpenseTemplate {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  amount: number;
  category: string;
  expense_type: ExpenseType;
  is_tax_deductible: boolean;
  recurring_frequency: RecurringFrequency | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating an expense template
 */
export interface CreateExpenseTemplateData {
  template_name: string;
  description?: string | null;
  amount: number;
  category: string;
  expense_type: ExpenseType;
  is_tax_deductible?: boolean;
  recurring_frequency?: RecurringFrequency | null;
  notes?: string | null;
}

/**
 * Data for updating an expense template
 */
export interface UpdateExpenseTemplateData {
  template_name?: string;
  description?: string | null;
  amount?: number;
  category?: string;
  expense_type?: ExpenseType;
  is_tax_deductible?: boolean;
  recurring_frequency?: RecurringFrequency | null;
  notes?: string | null;
}

// ============================================================================
// Hierarchy/Team Expense Types
// ============================================================================

/**
 * Expense with owner info (from downline/team queries)
 */
export interface DownlineExpense {
  id: string;
  user_id: string;
  owner_name: string;
  name: string;
  description: string | null;
  amount: number;
  category: string;
  date: string;
  expense_type: ExpenseType;
  is_tax_deductible: boolean;
  is_recurring: boolean;
  created_at: string;
}

/**
 * Expense summary by agent (aggregated view)
 */
export interface AgentExpenseSummary {
  user_id: string;
  owner_name: string;
  agency_name?: string;
  total_amount: number;
  expense_count: number;
  business_amount: number;
  personal_amount: number;
  tax_deductible_amount: number;
}

/**
 * Expense totals by category (IMO-level aggregation)
 */
export interface CategoryExpenseSummary {
  category: string;
  total_amount: number;
  expense_count: number;
  avg_amount: number;
}

/**
 * Date range filter for expense queries
 */
export interface ExpenseDateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * View mode for expense list
 */
export type ExpenseViewMode = "own" | "team" | "imo";

/**
 * Default expense categories
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  // Business Categories
  {
    name: "Office Supplies",
    description: "Pens, paper, printer ink, etc.",
    type: "business",
  },
  {
    name: "Travel",
    description: "Transportation, hotels, flights",
    type: "business",
  },
  {
    name: "Meals & Entertainment",
    description: "Business meals, client entertainment",
    type: "business",
  },
  {
    name: "Utilities",
    description: "Electricity, water, internet, phone",
    type: "business",
  },
  {
    name: "Insurance",
    description: "Business insurance (health, liability, property)",
    type: "business",
  },
  {
    name: "Marketing",
    description: "Advertising, promotional materials",
    type: "business",
  },
  {
    name: "Professional Services",
    description: "Legal, accounting, consulting",
    type: "business",
  },
  {
    name: "Technology",
    description: "Software subscriptions, hardware",
    type: "business",
  },
  {
    name: "Rent & Lease",
    description: "Office space, equipment leases",
    type: "business",
  },
  {
    name: "Training & Education",
    description: "Courses, conferences, books",
    type: "business",
  },
  {
    name: "Vehicle",
    description: "Gas, maintenance, registration (business use)",
    type: "business",
  },

  // Personal Categories
  {
    name: "Credit Card Bill",
    description: "Credit card monthly payments",
    type: "personal",
  },
  {
    name: "Mortgage/Rent",
    description: "Home mortgage or rent payments",
    type: "personal",
  },
  {
    name: "Groceries",
    description: "Food and household supplies",
    type: "personal",
  },
  {
    name: "Car Payment",
    description: "Auto loan or lease payments",
    type: "personal",
  },
  {
    name: "Healthcare",
    description: "Medical, dental, prescriptions",
    type: "personal",
  },
  {
    name: "Entertainment",
    description: "Movies, concerts, hobbies",
    type: "personal",
  },
  {
    name: "Childcare",
    description: "Daycare, babysitting, after-school programs",
    type: "personal",
  },
  {
    name: "Shopping",
    description: "Clothing, personal items",
    type: "personal",
  },
  {
    name: "Subscriptions",
    description: "Streaming, gym, personal memberships",
    type: "personal",
  },
  {
    name: "Personal Insurance",
    description: "Personal insurance (auto, life, home)",
    type: "personal",
  },
  {
    name: "Dining Out",
    description: "Restaurants, takeout (personal)",
    type: "personal",
  },

  // General
  { name: "Other", description: "Miscellaneous expenses", type: "other" },
];
