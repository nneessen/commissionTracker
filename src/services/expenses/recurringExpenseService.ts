// src/services/expenses/recurringExpenseService.ts

import { expenseRepository } from "./expense";
import type {
  Expense,
  CreateExpenseData,
  RecurringFrequency,
} from "../../types/expense.types";
import { parseLocalDate, formatDateForDB } from "../../lib/date";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../base/logger";

/**
 * Result of batch expense generation
 */
export interface BatchGenerationResult {
  generatedIds: string[];
  successCount: number;
  failureCount: number;
  errors: string[];
}

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
 *
 * Delegates database operations to ExpenseRepository.
 */
class RecurringExpenseService {
  /**
   * Generate future recurring expenses when creating a new expense
   * This is called AUTOMATICALLY when is_recurring=true
   *
   * @param baseExpense - The original expense data
   * @param userId - Current user ID
   * @returns BatchGenerationResult with success/failure tracking
   */
  async generateRecurringExpenses(
    baseExpense: CreateExpenseData,
    userId: string,
  ): Promise<BatchGenerationResult> {
    const result: BatchGenerationResult = {
      generatedIds: [],
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    if (!baseExpense.is_recurring || !baseExpense.recurring_frequency) {
      return result; // Not a recurring expense
    }

    const recurringGroupId = baseExpense.recurring_group_id || uuidv4();

    // Generate next 12 occurrences
    const occurrences = this.calculateOccurrences(
      baseExpense.date,
      baseExpense.recurring_frequency,
      baseExpense.recurring_end_date || null,
      12,
    );

    // Create all future expenses
    for (const occurrenceDate of occurrences) {
      const expenseData: CreateExpenseData = {
        ...baseExpense,
        date: occurrenceDate,
        recurring_group_id: recurringGroupId,
      };

      try {
        const id = await expenseRepository.createAndReturnId(userId, expenseData);
        if (id) {
          result.generatedIds.push(id);
          result.successCount++;
        } else {
          result.failureCount++;
          result.errors.push(`Failed to create expense for date ${occurrenceDate}`);
        }
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error creating expense for ${occurrenceDate}: ${errorMessage}`);
      }
    }

    // Log if there were partial failures
    if (result.failureCount > 0) {
      logger.warn(
        `Partial batch failure in recurring expenses: ${result.successCount} succeeded, ${result.failureCount} failed`,
        "RecurringExpenseService",
      );
    }

    return result;
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
    maxOccurrences: number = 12,
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
    nth: number,
  ): Date {
    const date = new Date(startDate);
    const originalDay = date.getDate();

    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + nth);
        break;

      case "weekly":
        date.setDate(date.getDate() + nth * 7);
        break;

      case "biweekly":
        date.setDate(date.getDate() + nth * 14);
        break;

      case "monthly": {
        // Add months first
        date.setMonth(date.getMonth() + nth);
        // Fix day overflow: if original was 31st and target month has 30 days, use 30th
        const lastDayOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
        date.setDate(Math.min(originalDay, lastDayOfMonth));
        break;
      }

      case "quarterly": {
        date.setMonth(date.getMonth() + nth * 3);
        // Fix day overflow for quarterly
        const lastDayOfQuarter = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
        date.setDate(Math.min(originalDay, lastDayOfQuarter));
        break;
      }

      case "semiannually": {
        date.setMonth(date.getMonth() + nth * 6);
        // Fix day overflow for semiannual
        const lastDayOfSemi = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
        date.setDate(Math.min(originalDay, lastDayOfSemi));
        break;
      }

      case "annually":
        date.setFullYear(date.getFullYear() + nth);
        break;

      default: {
        // Unknown frequency, default to monthly
        date.setMonth(date.getMonth() + nth);
        const lastDay = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).getDate();
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
    updates: Partial<CreateExpenseData>,
  ): Promise<number> {
    return expenseRepository.updateFutureInGroup(
      recurringGroupId,
      currentExpenseDate,
      updates,
    );
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
    currentExpenseDate: string,
  ): Promise<number> {
    return expenseRepository.deleteFutureInGroup(
      recurringGroupId,
      currentExpenseDate,
    );
  }

  /**
   * Get all expenses in a recurring group
   */
  async getRecurringGroup(recurringGroupId: string): Promise<Expense[]> {
    const entities =
      await expenseRepository.findByRecurringGroup(recurringGroupId);
    return entities as Expense[];
  }

  /**
   * Extend recurring expenses if user navigates beyond generated dates
   * Generates additional 12 months if needed
   *
   * @param recurringGroupId - The recurring group to extend
   * @param targetDate - The target date to extend to
   * @param userId - Current authenticated user ID (required for security)
   * @returns BatchGenerationResult with success/failure tracking
   */
  async extendRecurringExpenses(
    recurringGroupId: string,
    targetDate: string,
    userId: string,
  ): Promise<BatchGenerationResult> {
    const result: BatchGenerationResult = {
      generatedIds: [],
      successCount: 0,
      failureCount: 0,
      errors: [],
    };

    // Get the last expense in the group
    const lastExpense =
      await expenseRepository.findLastInRecurringGroup(recurringGroupId);

    if (!lastExpense) {
      return result;
    }

    // Security check: Verify the expense belongs to the current user
    if (lastExpense.user_id !== userId) {
      logger.warn(
        `Security: User ${userId} attempted to extend recurring group owned by ${lastExpense.user_id}`,
        "RecurringExpenseService",
      );
      result.errors.push("Cannot extend recurring expenses for another user");
      return result;
    }

    const lastDate = parseLocalDate(lastExpense.date);
    const target = parseLocalDate(targetDate);

    // If target is within existing range, no need to extend
    if (target <= lastDate) {
      return result;
    }

    // Generate more occurrences
    const newOccurrences = this.calculateOccurrences(
      lastExpense.date,
      lastExpense.recurring_frequency as RecurringFrequency,
      lastExpense.recurring_end_date,
      12,
    );

    for (const occurrenceDate of newOccurrences) {
      const expenseData: CreateExpenseData = {
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
      };

      try {
        // Use the passed userId, not the database value
        const id = await expenseRepository.createAndReturnId(userId, expenseData);
        if (id) {
          result.generatedIds.push(id);
          result.successCount++;
        } else {
          result.failureCount++;
          result.errors.push(`Failed to create expense for date ${occurrenceDate}`);
        }
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error creating expense for ${occurrenceDate}: ${errorMessage}`);
      }
    }

    // Log if there were partial failures
    if (result.failureCount > 0) {
      logger.warn(
        `Partial batch failure extending recurring expenses: ${result.successCount} succeeded, ${result.failureCount} failed`,
        "RecurringExpenseService",
      );
    }

    return result;
  }
}

export const recurringExpenseService = new RecurringExpenseService();
