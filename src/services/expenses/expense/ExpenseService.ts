// src/services/expenses/expense/ExpenseService.ts
import { ServiceResponse } from "../../base/BaseService";
import { ExpenseRepository } from "./ExpenseRepository";
import { supabase } from "../../base/supabase";
import { isSameMonth, isSameYear } from "@/lib/date";
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseFilters,
  ExpenseTotals,
  MonthlyExpenseBreakdown,
  YearlyExpenseSummary,
} from "@/types/expense.types";

/**
 * Service for expense business logic
 * Uses ExpenseRepository for data access
 */
class ExpenseServiceClass {
  private repository: ExpenseRepository;

  constructor() {
    this.repository = new ExpenseRepository();
  }

  /**
   * Get all expenses with optional filtering
   */
  async getAll(filters?: ExpenseFilters): Promise<ServiceResponse<Expense[]>> {
    try {
      const expenses = await this.repository.findWithFilters(filters);
      return { success: true, data: expenses as Expense[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get expense by ID
   */
  async getById(id: string): Promise<ServiceResponse<Expense>> {
    try {
      const expense = await this.repository.findById(id);
      if (!expense) {
        return { success: false, error: new Error("Expense not found") };
      }
      return { success: true, data: expense as Expense };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a new expense
   */
  async create(data: CreateExpenseData): Promise<ServiceResponse<Expense>> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: new Error("User not authenticated") };
      }

      // Generate recurring_group_id if this is a recurring expense
      const isRecurring = data.is_recurring || false;
      const recurringGroupId =
        isRecurring && !data.recurring_group_id
          ? crypto.randomUUID()
          : data.recurring_group_id;

      // Insert expense with user_id
      const { data: result, error } = await supabase
        .from("expenses")
        .insert({
          ...data,
          user_id: user.id,
          is_recurring: isRecurring,
          recurring_frequency: data.recurring_frequency || null,
          recurring_group_id: recurringGroupId,
          recurring_end_date: data.recurring_end_date || null,
          is_tax_deductible: data.is_tax_deductible || false,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // AUTO-GENERATE future recurring expenses
      if (isRecurring && data.recurring_frequency) {
        try {
          const { recurringExpenseService } =
            await import("../recurringExpenseService");
          await recurringExpenseService.generateRecurringExpenses(
            { ...data, recurring_group_id: recurringGroupId },
            user.id,
          );
        } catch (recurringError) {
          console.error(
            "Failed to generate recurring expenses:",
            recurringError,
          );
        }
      }

      return { success: true, data: result as Expense };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update an expense
   */
  async update(
    id: string,
    updates: UpdateExpenseData,
  ): Promise<ServiceResponse<Expense>> {
    try {
      const expense = await this.repository.update(id, updates);
      return { success: true, data: expense as Expense };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get expenses by date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<ServiceResponse<Expense[]>> {
    try {
      const expenses = await this.repository.findByDateRange(
        startDate,
        endDate,
      );
      return { success: true, data: expenses as Expense[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get expense totals
   */
  async getTotals(
    filters?: ExpenseFilters,
  ): Promise<ServiceResponse<ExpenseTotals>> {
    try {
      const result = await this.getAll(filters);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      const expenses = result.data || [];
      const now = new Date();

      const totals = expenses.reduce(
        (acc, expense) => {
          acc.total += expense.amount;

          if (expense.expense_type === "personal") {
            acc.personal += expense.amount;
          } else {
            acc.business += expense.amount;
          }

          if (expense.is_tax_deductible) {
            acc.deductible += expense.amount;
          }

          if (isSameMonth(expense.date, now)) {
            acc.monthlyTotal += expense.amount;
          }

          if (isSameYear(expense.date, now)) {
            acc.yearlyTotal += expense.amount;
          }

          return acc;
        },
        {
          total: 0,
          personal: 0,
          business: 0,
          deductible: 0,
          monthlyTotal: 0,
          yearlyTotal: 0,
        },
      );

      return { success: true, data: totals };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get monthly breakdown for a specific year
   */
  async getMonthlyBreakdown(
    year: number,
  ): Promise<ServiceResponse<MonthlyExpenseBreakdown[]>> {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const result = await this.getByDateRange(startDate, endDate);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const expenses = result.data || [];
      const monthlyData: Record<string, MonthlyExpenseBreakdown> = {};

      expenses.forEach((expense) => {
        const monthKey = expense.date.substring(0, 7);

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

        if (expense.expense_type === "personal") {
          monthlyData[monthKey].personal += expense.amount;
        } else {
          monthlyData[monthKey].business += expense.amount;
        }

        if (expense.is_tax_deductible) {
          monthlyData[monthKey].deductible += expense.amount;
        }

        if (!monthlyData[monthKey].byCategory[expense.category]) {
          monthlyData[monthKey].byCategory[expense.category] = 0;
        }
        monthlyData[monthKey].byCategory[expense.category] += expense.amount;
      });

      const breakdown = Object.values(monthlyData).sort((a, b) =>
        a.month.localeCompare(b.month),
      );

      return { success: true, data: breakdown };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get yearly summary
   */
  async getYearlySummary(
    year: number,
  ): Promise<ServiceResponse<YearlyExpenseSummary>> {
    try {
      const breakdownResult = await this.getMonthlyBreakdown(year);
      if (!breakdownResult.success) {
        return { success: false, error: breakdownResult.error };
      }

      const monthlyBreakdown = breakdownResult.data || [];

      const summary: YearlyExpenseSummary = {
        year,
        total: 0,
        personal: 0,
        business: 0,
        deductible: 0,
        monthlyBreakdown,
        byCategory: {},
      };

      monthlyBreakdown.forEach((month) => {
        summary.total += month.total;
        summary.personal += month.personal;
        summary.business += month.business;
        summary.deductible += month.deductible;

        Object.entries(month.byCategory).forEach(([category, amount]) => {
          if (!summary.byCategory[category]) {
            summary.byCategory[category] = 0;
          }
          summary.byCategory[category] += amount;
        });
      });

      return { success: true, data: summary };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Import expenses from CSV data
   */
  async importFromCSV(
    csvData: string,
  ): Promise<ServiceResponse<{ imported: number; errors: string[] }>> {
    try {
      const lines = csvData.trim().split("\n");
      const headers = lines[0].toLowerCase().replace(/['"]/g, "").split(",");

      let imported = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].match(/(".*?"|[^,]+)/g) || [];
          const cleanValues = values.map((v) => v.replace(/^["']|["']$/g, ""));

          const recurringFreqValue =
            cleanValues[headers.indexOf("recurring frequency")];

          const expenseData: CreateExpenseData = {
            date:
              cleanValues[headers.indexOf("date")] ||
              new Date().toISOString().split("T")[0],
            name: cleanValues[headers.indexOf("name")] || "Imported Expense",
            description: cleanValues[headers.indexOf("description")] || null,
            amount: parseFloat(cleanValues[headers.indexOf("amount")] || "0"),
            category: cleanValues[headers.indexOf("category")] || "Other",
            expense_type:
              (cleanValues[headers.indexOf("type")] as
                | "personal"
                | "business") || "personal",
            is_tax_deductible:
              cleanValues[headers.indexOf("tax deductible")]?.toLowerCase() ===
              "yes",
            is_recurring:
              cleanValues[headers.indexOf("recurring")]?.toLowerCase() ===
              "yes",
            recurring_frequency:
              recurringFreqValue && recurringFreqValue.trim() !== ""
                ? (recurringFreqValue as CreateExpenseData["recurring_frequency"])
                : null,
            notes: cleanValues[headers.indexOf("notes")] || null,
          };

          const result = await this.create(expenseData);
          if (result.success) {
            imported++;
          } else {
            errors.push(
              `Row ${i + 1}: ${result.error?.message || "Unknown error"}`,
            );
          }
        } catch (error) {
          errors.push(
            `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return { success: true, data: { imported, errors } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ============================================================================
  // Legacy API for backward compatibility
  // ============================================================================

  /** @deprecated Use getAll instead */
  async getAllExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const result = await this.getAll(filters);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getById instead */
  async getExpenseById(id: string): Promise<Expense> {
    const result = await this.getById(id);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use create instead */
  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const result = await this.create(data);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use update instead */
  async updateExpense(
    id: string,
    updates: UpdateExpenseData,
  ): Promise<Expense> {
    const result = await this.update(id, updates);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use delete instead */
  async deleteExpense(id: string): Promise<void> {
    const result = await this.delete(id);
    if (!result.success) {
      throw result.error;
    }
  }

  /** @deprecated Use getByDateRange instead */
  async getExpensesByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Expense[]> {
    const result = await this.getByDateRange(startDate, endDate);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getTotals instead */
  async getExpenseTotals(filters?: ExpenseFilters): Promise<ExpenseTotals> {
    const result = await this.getTotals(filters);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }

  /** @deprecated Use getMonthlyBreakdown instead */
  async getExpenseMonthlyBreakdown(
    year: number,
  ): Promise<MonthlyExpenseBreakdown[]> {
    const result = await this.getMonthlyBreakdown(year);
    if (!result.success) {
      throw result.error;
    }
    return result.data || [];
  }

  /** @deprecated Use getYearlySummary instead */
  async getExpenseYearlySummary(year: number): Promise<YearlyExpenseSummary> {
    const result = await this.getYearlySummary(year);
    if (!result.success) {
      throw result.error;
    }
    return result.data!;
  }
}

export const expenseService = new ExpenseServiceClass();
export { ExpenseServiceClass };
