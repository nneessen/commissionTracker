export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseData {
  personal: ExpenseItem[];
  business: ExpenseItem[];
  debt: ExpenseItem[];
}

export type ExpenseCategory = "personal" | "business" | "debt";

export interface ExpenseTotals {
  personalTotal: number;
  businessTotal: number;
  debtTotal: number;
  monthlyExpenses: number;
}

export interface NewExpenseForm {
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export interface Constants {
  avgAP: number;
  commissionRate: number;
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