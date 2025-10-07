// src/services/expenses/expenseService.ts

import { supabase, TABLES } from '../base/supabase';
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseFilters,
  ExpenseTotals,
  MonthlyExpenseBreakdown,
  ExpenseType,
} from '../../types/expense.types';

// Database record type (snake_case from DB, matching ACTUAL schema)
interface ExpenseDBRecord {
  id: string;
  user_id: string;
  name: string;
  description: string;
  amount: string; // Decimal comes as string from DB
  category: string; // TEXT in DB
  expense_type: ExpenseType;
  date: string; // Column is named 'date' not 'expense_date'
  is_recurring: boolean;
  recurring_frequency: string | null;
  receipt_url: string | null;
  is_deductible: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

class ExpenseService {
  /**
   * Fetch all expenses with optional filtering
   */
  async getAll(filters?: ExpenseFilters): Promise<Expense[]> {
    let query = supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .order('date', { ascending: false });

    // Apply filters
    if (filters?.expenseType && filters.expenseType !== 'all') {
      query = query.eq('expense_type', filters.expenseType);
    }

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    if (filters?.deductibleOnly) {
      query = query.eq('is_deductible', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    let expenses = (data || []).map(this.transformFromDB);

    // Apply search filter (client-side since it searches multiple fields)
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      expenses = expenses.filter(
        (exp) =>
          exp.name.toLowerCase().includes(searchLower) ||
          exp.description.toLowerCase().includes(searchLower)
      );
    }

    return expenses;
  }

  /**
   * Fetch a single expense by ID
   */
  async getById(id: string): Promise<Expense | null> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch expense: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Create a new expense
   */
  async create(expenseData: CreateExpenseData): Promise<Expense> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const dbData = {
      ...this.transformToDB(expenseData),
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  /**
   * Update an existing expense
   */
  async update(id: string, updates: UpdateExpenseData): Promise<Expense> {
    const dbData = this.transformToDB(updates);

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLES.EXPENSES).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }

  /**
   * Get expenses by type (personal or business)
   */
  async getByType(expenseType: ExpenseType): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('expense_type', expenseType)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by type: ${error.message}`);
    }

    return (data || []).map(this.transformFromDB);
  }

  /**
   * Get expenses by category
   */
  async getByCategory(category: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('category', category)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by category: ${error.message}`);
    }

    return (data || []).map(this.transformFromDB);
  }

  /**
   * Get expenses within a date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by date range: ${error.message}`);
    }

    return (data || []).map(this.transformFromDB);
  }

  /**
   * Calculate total expenses with breakdowns
   */
  async getTotals(): Promise<ExpenseTotals> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('amount, expense_type, is_deductible');

    if (error) {
      throw new Error(`Failed to fetch expense totals: ${error.message}`);
    }

    const expenses = data || [];

    const totals: ExpenseTotals = {
      personal: 0,
      business: 0,
      deductible: 0,
      total: 0,
      monthlyTotal: 0,
    };

    expenses.forEach((expense) => {
      const amount = parseFloat(expense.amount);
      totals.total += amount;

      if (expense.expense_type === 'personal') {
        totals.personal += amount;
      } else {
        totals.business += amount;
      }

      if (expense.is_deductible) {
        totals.deductible += amount;
      }
    });

    // Calculate current month total
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const monthlyExpenses = await this.getByDateRange(startOfMonth, endOfMonth);
    totals.monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return totals;
  }

  /**
   * Get monthly expense breakdown
   */
  async getMonthlyBreakdown(year: number, month: number): Promise<MonthlyExpenseBreakdown> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('amount, category, expense_type')
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      throw new Error(`Failed to fetch monthly breakdown: ${error.message}`);
    }

    const expenses = data || [];

    const breakdown: MonthlyExpenseBreakdown = {
      totalExpenses: 0,
      categoryBreakdown: {},
      businessExpenses: 0,
      personalExpenses: 0,
    };

    expenses.forEach((expense) => {
      const amount = parseFloat(expense.amount);
      breakdown.totalExpenses += amount;

      // Category breakdown
      const category = expense.category;
      breakdown.categoryBreakdown[category] =
        (breakdown.categoryBreakdown[category] || 0) + amount;

      // Type breakdown
      if (expense.expense_type === 'business') {
        breakdown.businessExpenses += amount;
      } else {
        breakdown.personalExpenses += amount;
      }
    });

    return breakdown;
  }

  /**
   * Transform database record to application Expense type
   */
  private transformFromDB(dbRecord: ExpenseDBRecord): Expense {
    return {
      id: dbRecord.id,
      user_id: dbRecord.user_id,
      name: dbRecord.name,
      description: dbRecord.description,
      amount: parseFloat(dbRecord.amount),
      category: dbRecord.category,
      expense_type: dbRecord.expense_type,
      date: dbRecord.date,
      is_recurring: dbRecord.is_recurring,
      recurring_frequency: dbRecord.recurring_frequency,
      receipt_url: dbRecord.receipt_url,
      is_deductible: dbRecord.is_deductible,
      notes: dbRecord.notes,
      created_at: dbRecord.created_at,
      updated_at: dbRecord.updated_at,
    };
  }

  /**
   * Transform application data to database format
   */
  private transformToDB(
    data: CreateExpenseData | UpdateExpenseData
  ): Partial<ExpenseDBRecord> {
    const dbData: Partial<ExpenseDBRecord> = {};

    if ('name' in data && data.name !== undefined) dbData.name = data.name;
    if ('description' in data && data.description !== undefined)
      dbData.description = data.description;
    if ('amount' in data && data.amount !== undefined)
      dbData.amount = data.amount.toString();
    if ('category' in data && data.category !== undefined) dbData.category = data.category;
    if ('expense_type' in data && data.expense_type !== undefined)
      dbData.expense_type = data.expense_type;
    if ('date' in data && data.date !== undefined) dbData.date = data.date;
    if ('is_recurring' in data && data.is_recurring !== undefined)
      dbData.is_recurring = data.is_recurring;
    if ('recurring_frequency' in data && data.recurring_frequency !== undefined)
      dbData.recurring_frequency = data.recurring_frequency;
    if ('receipt_url' in data && data.receipt_url !== undefined)
      dbData.receipt_url = data.receipt_url;
    if ('is_deductible' in data && data.is_deductible !== undefined)
      dbData.is_deductible = data.is_deductible;
    if ('notes' in data && data.notes !== undefined) dbData.notes = data.notes;

    return dbData;
  }
}

export const expenseService = new ExpenseService();
export { ExpenseService };
export type { CreateExpenseData, UpdateExpenseData } from '../../types/expense.types';
