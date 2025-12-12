// src/services/expenses/expenseService.ts

import {supabase, TABLES} from '../base/supabase';
import {isSameMonth, isSameYear} from '../../lib/date';
import type {Expense, CreateExpenseData, UpdateExpenseData, ExpenseFilters, ExpenseTotals, MonthlyExpenseBreakdown, YearlyExpenseSummary} from '../../types/expense.types';

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
      query = query.eq('is_tax_deductible', true);
    }

    if (filters?.recurringOnly) {
      query = query.eq('is_recurring', true);
    }

    if (filters?.searchTerm) {
      // Search in name and description
      query = query.or(
        `name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return (data || []) as Expense[];
  }

  /**
   * Get a single expense by ID
   */
  async getById(id: string): Promise<Expense> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch expense: ${error.message}`);
    }

    if (!data) {
      throw new Error('Expense not found');
    }

    return data as Expense;
  }

  /**
   * Create a new expense
   * If is_recurring=true, automatically generates future occurrences
   */
  async create(expenseData: CreateExpenseData): Promise<Expense> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate recurring_group_id if this is a recurring expense
    const isRecurring = expenseData.is_recurring || false;
    const recurringGroupId = isRecurring && !expenseData.recurring_group_id
      ? this.generateUUID()
      : expenseData.recurring_group_id;

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .insert({
        ...expenseData,
        user_id: user.id,
        is_recurring: isRecurring,
        recurring_frequency: expenseData.recurring_frequency || null,
        recurring_group_id: recurringGroupId,
        recurring_end_date: expenseData.recurring_end_date || null,
        is_tax_deductible: expenseData.is_tax_deductible || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }

    // AUTO-GENERATE future recurring expenses
    if (isRecurring && expenseData.recurring_frequency) {
      try {
        const { recurringExpenseService } = await import('./recurringExpenseService');
        await recurringExpenseService.generateRecurringExpenses(
          { ...expenseData, recurring_group_id: recurringGroupId },
          user.id
        );
      } catch (recurringError) {
        console.error('Failed to generate recurring expenses:', recurringError);
        // Don't fail the main creation if recurring generation fails
      }
    }

    return data as Expense;
  }

  /**
   * Generate UUID for recurring group
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Update an existing expense
   */
  async update(id: string, updates: UpdateExpenseData): Promise<Expense> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }

    return data as Expense;
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.EXPENSES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }

  /**
   * Get expenses by date range
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

    return (data || []) as Expense[];
  }

  /**
   * Get expense totals
   */
  async getTotals(filters?: ExpenseFilters): Promise<ExpenseTotals> {
    const expenses = await this.getAll(filters);

    const now = new Date();

    const totals = expenses.reduce((acc, expense) => {
      acc.total += expense.amount;

      if (expense.expense_type === 'personal') {
        acc.personal += expense.amount;
      } else {
        acc.business += expense.amount;
      }

      if (expense.is_tax_deductible) {
        acc.deductible += expense.amount;
      }

      // Check if expense is in current month using proper date comparison
      if (isSameMonth(expense.date, now)) {
        acc.monthlyTotal += expense.amount;
      }

      // Check if expense is in current year using proper date comparison
      if (isSameYear(expense.date, now)) {
        acc.yearlyTotal += expense.amount;
      }

      return acc;
    }, {
      total: 0,
      personal: 0,
      business: 0,
      deductible: 0,
      monthlyTotal: 0,
      yearlyTotal: 0,
    });

    return totals;
  }

  /**
   * Get monthly breakdown for a specific year
   */
  async getMonthlyBreakdown(year: number): Promise<MonthlyExpenseBreakdown[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const expenses = await this.getByDateRange(startDate, endDate);

    const monthlyData: Record<string, MonthlyExpenseBreakdown> = {};

    expenses.forEach(expense => {
      const monthKey = expense.date.substring(0, 7); // YYYY-MM

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          personal: 0,
          business: 0,
          deductible: 0,
          byCategory: {},
        };
      }

      monthlyData[monthKey].total += expense.amount;

      if (expense.expense_type === 'personal') {
        monthlyData[monthKey].personal += expense.amount;
      } else {
        monthlyData[monthKey].business += expense.amount;
      }

      if (expense.is_tax_deductible) {
        monthlyData[monthKey].deductible += expense.amount;
      }

      // Track by category
      if (!monthlyData[monthKey].byCategory[expense.category]) {
        monthlyData[monthKey].byCategory[expense.category] = 0;
      }
      monthlyData[monthKey].byCategory[expense.category] += expense.amount;
    });

    // Convert to array and sort by month
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get yearly summary
   */
  async getYearlySummary(year: number): Promise<YearlyExpenseSummary> {
    const monthlyBreakdown = await this.getMonthlyBreakdown(year);

    const summary: YearlyExpenseSummary = {
      year,
      total: 0,
      personal: 0,
      business: 0,
      deductible: 0,
      monthlyBreakdown,
      byCategory: {},
    };

    monthlyBreakdown.forEach(month => {
      summary.total += month.total;
      summary.personal += month.personal;
      summary.business += month.business;
      summary.deductible += month.deductible;

      // Aggregate categories
      Object.entries(month.byCategory).forEach(([category, amount]) => {
        if (!summary.byCategory[category]) {
          summary.byCategory[category] = 0;
        }
        summary.byCategory[category] += amount;
      });
    });

    return summary;
  }

  /**
   * Import expenses from CSV data
   */
  async importFromCSV(csvData: string): Promise<{ imported: number; errors: string[] }> {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].toLowerCase().replace(/['"]/g, '').split(',');

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].match(/(".*?"|[^,]+)/g) || [];
        const cleanValues = values.map(v => v.replace(/^["']|["']$/g, ''));

        const recurringFreqValue = cleanValues[headers.indexOf('recurring frequency')];

        const expenseData: CreateExpenseData = {
          date: cleanValues[headers.indexOf('date')] || new Date().toISOString().split('T')[0],
          name: cleanValues[headers.indexOf('name')] || 'Imported Expense',
          description: cleanValues[headers.indexOf('description')] || null,
          amount: parseFloat(cleanValues[headers.indexOf('amount')] || '0'),
          category: cleanValues[headers.indexOf('category')] || 'Other',
          expense_type: (cleanValues[headers.indexOf('type')] as 'personal' | 'business') || 'personal',
          is_tax_deductible: cleanValues[headers.indexOf('tax deductible')]?.toLowerCase() === 'yes',
          is_recurring: cleanValues[headers.indexOf('recurring')]?.toLowerCase() === 'yes',
          recurring_frequency: recurringFreqValue && recurringFreqValue.trim() !== '' ? recurringFreqValue as any : null,
          notes: cleanValues[headers.indexOf('notes')] || null,
        };

        await this.create(expenseData);
        imported++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  }
}

export const expenseService = new ExpenseService();