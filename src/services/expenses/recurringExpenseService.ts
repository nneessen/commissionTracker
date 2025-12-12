// src/services/expenses/recurringExpenseService.ts

import {supabase} from '../base/supabase';
import type {Expense, CreateExpenseData, RecurringFrequency} from '../../types/expense.types';
import {parseLocalDate, formatDateForDB} from '../../lib/date';
import {v4 as uuidv4} from 'uuid';

/**
 * RecurringExpenseService - Auto-generate recurring expenses
 *
 * KEY BEHAVIOR: When a user marks an expense as recurring, this service
 * IMMEDIATELY generates the next 12 occurrences. User never has to think about it again.
 *
 * Edge Cases Handled:
 * - Each generated expense is independent (can be edited/deleted individually)
 * - All linked by recurring_group_id for bulk operations
 * - Respects recurring_end_date if set
 * - Generates forward from the expense date, not from today
 */
class RecurringExpenseService {
  private readonly TABLES = {
    EXPENSES: 'expenses',
  };

  /**
   * Generate future recurring expenses when creating a new expense
   * This is called AUTOMATICALLY when is_recurring=true
   *
   * @param baseExpense - The original expense data
   * @param userId - Current user ID
   * @returns Array of generated expense IDs
   */
  async generateRecurringExpenses(
    baseExpense: CreateExpenseData,
    userId: string
  ): Promise<string[]> {
    if (!baseExpense.is_recurring || !baseExpense.recurring_frequency) {
      return []; // Not a recurring expense
    }

    const recurringGroupId = baseExpense.recurring_group_id || uuidv4();
    const generatedIds: string[] = [];

    // Generate next 12 occurrences
    const occurrences = this.calculateOccurrences(
      baseExpense.date,
      baseExpense.recurring_frequency,
      baseExpense.recurring_end_date || null,
      12
    );

    // Create all future expenses in batch
    for (const occurrenceDate of occurrences) {
      const expenseData: CreateExpenseData = {
        ...baseExpense,
        date: occurrenceDate,
        recurring_group_id: recurringGroupId,
      };

      const { data, error } = await supabase
        .from(this.TABLES.EXPENSES)
        .insert({
          ...expenseData,
          user_id: userId,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create recurring expense:', error);
        continue; // Skip this one, continue with others
      }

      if (data) {
        generatedIds.push(data.id);
      }
    }

    return generatedIds;
  }

  /**
   * Calculate future occurrence dates based on frequency
   *
   * @param startDate - Starting date (ISO string)
   * @param frequency - How often it recurs
   * @param endDate - Optional end date
   * @param maxOccurrences - Maximum number to generate (default 12)
   * @returns Array of ISO date strings
   */
  private calculateOccurrences(
    startDate: string,
    frequency: RecurringFrequency,
    endDate: string | null,
    maxOccurrences: number = 12
  ): string[] {
    const occurrences: string[] = [];
    const start = parseLocalDate(startDate);
    const end = endDate ? parseLocalDate(endDate) : null;

    for (let i = 1; i <= maxOccurrences; i++) {
      const nextDate = this.getNextOccurrence(start, frequency, i);

      // Stop if past end date
      if (end && nextDate > end) {
        break;
      }

      occurrences.push(formatDateForDB(nextDate));
    }

    return occurrences;
  }

  /**
   * Get the Nth next occurrence from start date
   *
   * FIXED: Handles edge cases like Jan 31 + 1 month = Feb 28 (not Mar 3)
   * Sets day to minimum of original day and last day of target month
   */
  private getNextOccurrence(
    startDate: Date,
    frequency: RecurringFrequency,
    nth: number
  ): Date {
    const date = new Date(startDate);
    const originalDay = date.getDate();

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + nth);
        break;

      case 'weekly':
        date.setDate(date.getDate() + (nth * 7));
        break;

      case 'biweekly':
        date.setDate(date.getDate() + (nth * 14));
        break;

      case 'monthly': {
        // Add months first
        date.setMonth(date.getMonth() + nth);
        // Fix day overflow: if original was 31st and target month has 30 days, use 30th
        const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(originalDay, lastDayOfMonth));
      }
        break;

      case 'quarterly': {
        date.setMonth(date.getMonth() + (nth * 3));
        // Fix day overflow for quarterly
        const lastDayOfQuarter = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(originalDay, lastDayOfQuarter));
      }
        break;

      case 'semiannually': {
        date.setMonth(date.getMonth() + (nth * 6));
        // Fix day overflow for semiannual
        const lastDayOfSemi = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(originalDay, lastDayOfSemi));
      }
        break;

      case 'annually':
        date.setFullYear(date.getFullYear() + nth);
        break;

      default: {
        // Unknown frequency, default to monthly
        date.setMonth(date.getMonth() + nth);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(originalDay, lastDay));
    }

      }
    return date;
  }

  /**
   * Update all future expenses in a recurring group
   * Used when user edits a recurring expense and chooses "Update all future"
   *
   * @param recurringGroupId - The group ID
   * @param currentExpenseDate - The date of expense being edited
   * @param updates - Fields to update
   */
  async updateFutureExpenses(
    recurringGroupId: string,
    currentExpenseDate: string,
    updates: Partial<CreateExpenseData>
  ): Promise<number> {
    const { data, error } = await supabase
      .from(this.TABLES.EXPENSES)
      .update(updates)
      .eq('recurring_group_id', recurringGroupId)
      .gte('date', currentExpenseDate)
      .select('id');

    if (error) {
      throw new Error(`Failed to update future expenses: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Delete all future expenses in a recurring group
   * Used when user deletes a recurring expense and chooses "Stop future occurrences"
   *
   * @param recurringGroupId - The group ID
   * @param currentExpenseDate - The date of expense being deleted
   */
  async deleteFutureExpenses(
    recurringGroupId: string,
    currentExpenseDate: string
  ): Promise<number> {
    const { data, error } = await supabase
      .from(this.TABLES.EXPENSES)
      .delete()
      .eq('recurring_group_id', recurringGroupId)
      .gt('date', currentExpenseDate) // Greater than (not including current)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete future expenses: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get all expenses in a recurring group
   */
  async getRecurringGroup(recurringGroupId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.TABLES.EXPENSES)
      .select('*')
      .eq('recurring_group_id', recurringGroupId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch recurring group:', error);
      return [];
    }

    return data as Expense[];
  }

  /**
   * Extend recurring expenses if user navigates beyond generated dates
   * Generates additional 12 months if needed
   */
  async extendRecurringExpenses(
    recurringGroupId: string,
    targetDate: string
  ): Promise<number> {
    // Get the last expense in the group
    const { data: lastExpense, error } = await supabase
      .from(this.TABLES.EXPENSES)
      .select('*')
      .eq('recurring_group_id', recurringGroupId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastExpense) {
      return 0;
    }

    const lastDate = parseLocalDate(lastExpense.date);
    const target = parseLocalDate(targetDate);

    // If target is within existing range, no need to extend
    if (target <= lastDate) {
      return 0;
    }

    // Generate more occurrences
    const newOccurrences = this.calculateOccurrences(
      lastExpense.date,
      lastExpense.recurring_frequency as RecurringFrequency,
      lastExpense.recurring_end_date,
      12
    );

    let created = 0;
    for (const occurrenceDate of newOccurrences) {
      const expenseData = {
        name: lastExpense.name,
        description: lastExpense.description,
        amount: lastExpense.amount,
        category: lastExpense.category,
        expense_type: lastExpense.expense_type,
        date: occurrenceDate,
        is_recurring: true,
        recurring_frequency: lastExpense.recurring_frequency,
        recurring_group_id: recurringGroupId,
        recurring_end_date: lastExpense.recurring_end_date,
        is_tax_deductible: lastExpense.is_tax_deductible,
        receipt_url: lastExpense.receipt_url,
        notes: lastExpense.notes,
        user_id: lastExpense.user_id,
      };

      const { error: insertError } = await supabase
        .from(this.TABLES.EXPENSES)
        .insert(expenseData);

      if (!insertError) {
        created++;
      }
    }

    return created;
  }
}

export const recurringExpenseService = new RecurringExpenseService();
