export type ExpenseType = "personal" | "business";
export type ExpenseCategory = "personal" | "business"; // For backward compatibility

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  expenseType?: ExpenseType; // Optional for backward compatibility
  description?: string;
  isDeductible?: boolean; // Optional for backward compatibility
  receiptUrl?: string;
  createdAt?: Date; // Optional for backward compatibility
  updatedAt?: Date; // Optional for backward compatibility
  created_at?: Date; // Optional for BaseEntity compatibility
  updated_at?: Date; // Optional for BaseEntity compatibility
}

export interface ExpenseData {
  personal: Expense[];
  business: Expense[];
}

export interface ExpenseTotals {
  personalTotal: number;
  businessTotal: number;
  monthlyExpenses: number;
}

export interface NewExpenseForm {
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export interface Constants {
  avgAP: number;
  target1: number;
  target2: number;
}

export interface CalculationResult {
  scenario: string;
  commissionNeeded: number;
  apNeeded100: number;
  policies100: number;
  apNeeded90: number;
  policies90: number;
  apNeeded80: number;
  policies80: number;
  apNeeded70: number;
  policies70: number;
}

export interface PerformanceMetrics {
  weeklyAPTarget: number;
  dailyAPTarget: number;
  quarterlyAPTarget: number;
  commissionPerPolicy: number;
  expenseRatio: string;
}

// Service layer types
export type CreateExpenseData = Omit<
  Expense,
  "id" | "createdAt" | "updatedAt" | "created_at" | "updated_at"
>;
export type UpdateExpenseData = Partial<CreateExpenseData>;

// Legacy support
export interface ExpenseItem extends Expense {}

