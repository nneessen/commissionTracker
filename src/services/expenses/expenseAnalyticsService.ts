// src/services/expenses/expenseAnalyticsService.ts

import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import type {
  Expense,
  ExpenseTrendData,
  CategoryBreakdownData,
  ExpenseComparisonData,
  AdvancedExpenseFilters,
} from '@/types/expense.types';

export class ExpenseAnalyticsService {
  /**
   * Get monthly trend data for the last N months
   */
  getTrendData(expenses: Expense[], months: number = 12): ExpenseTrendData[] {
    const now = new Date();
    const monthsData: Map<string, { personal: number; business: number; total: number }> = new Map();

    // Initialize map with last N months
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(startOfMonth(now), i);
      const monthKey = format(monthDate, 'MMM yyyy');
      monthsData.set(monthKey, { personal: 0, business: 0, total: 0 });
    }

    // Aggregate expenses by month
    expenses.forEach((expense) => {
      const expenseDate = parseISO(expense.date);
      const monthKey = format(expenseDate, 'MMM yyyy');

      if (monthsData.has(monthKey)) {
        const data = monthsData.get(monthKey)!;
        const amount = expense.amount;

        data.total += amount;
        if (expense.expense_type === 'personal') {
          data.personal += amount;
        } else {
          data.business += amount;
        }

        monthsData.set(monthKey, data);
      }
    });

    // Convert to array
    return Array.from(monthsData.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  /**
   * Get category breakdown with percentages
   */
  getCategoryBreakdown(expenses: Expense[]): CategoryBreakdownData[] {
    const categoryMap: Map<
      string,
      { amount: number; count: number }
    > = new Map();

    let totalAmount = 0;

    expenses.forEach((expense) => {
      const { category, amount } = expense;
      totalAmount += amount;

      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    });

    // Convert to array with percentages
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get business vs personal comparison data
   */
  getComparisonData(expenses: Expense[]): ExpenseComparisonData[] {
    const personal: ExpenseComparisonData = {
      type: 'personal',
      amount: 0,
      count: 0,
      avgAmount: 0,
    };

    const business: ExpenseComparisonData = {
      type: 'business',
      amount: 0,
      count: 0,
      avgAmount: 0,
    };

    expenses.forEach((expense) => {
      if (expense.expense_type === 'personal') {
        personal.amount += expense.amount;
        personal.count += 1;
      } else {
        business.amount += expense.amount;
        business.count += 1;
      }
    });

    personal.avgAmount = personal.count > 0 ? personal.amount / personal.count : 0;
    business.avgAmount = business.count > 0 ? business.amount / business.count : 0;

    return [personal, business];
  }

  /**
   * Filter expenses with advanced filters
   */
  applyAdvancedFilters(expenses: Expense[], filters: AdvancedExpenseFilters): Expense[] {
    return expenses.filter((expense) => {
      // Expense type filter
      if (filters.expenseType && filters.expenseType !== 'all') {
        if (expense.expense_type !== filters.expenseType) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (expense.category !== filters.category) return false;
      }

      // Date range filter
      if (filters.startDate) {
        if (expense.date < filters.startDate) return false;
      }
      if (filters.endDate) {
        if (expense.date > filters.endDate) return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesName = expense.name.toLowerCase().includes(searchLower);
        const matchesDescription = expense.description?.toLowerCase().includes(searchLower);
        const matchesNotes = expense.notes?.toLowerCase().includes(searchLower);

        if (!matchesName && !matchesDescription && !matchesNotes) return false;
      }

      // Amount range filter
      if (filters.minAmount !== undefined && expense.amount < filters.minAmount) {
        return false;
      }
      if (filters.maxAmount !== undefined && expense.amount > filters.maxAmount) {
        return false;
      }

      // Recurring filter
      if (filters.recurringOnly && !expense.is_recurring) {
        return false;
      }

      // Tax deductible filter
      if (filters.deductibleOnly && !expense.is_tax_deductible) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get top categories by spending
   */
  getTopCategories(expenses: Expense[], limit: number = 5): CategoryBreakdownData[] {
    const breakdown = this.getCategoryBreakdown(expenses);
    return breakdown.slice(0, limit);
  }

  /**
   * Get spending statistics
   */
  getStatistics(expenses: Expense[]) {
    if (expenses.length === 0) {
      return {
        total: 0,
        average: 0,
        median: 0,
        highest: 0,
        lowest: 0,
        count: 0,
      };
    }

    const amounts = expenses.map((e) => e.amount).sort((a, b) => a - b);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const average = total / amounts.length;

    const medianIndex = Math.floor(amounts.length / 2);
    const median =
      amounts.length % 2 === 0
        ? (amounts[medianIndex - 1] + amounts[medianIndex]) / 2
        : amounts[medianIndex];

    return {
      total,
      average,
      median,
      highest: amounts[amounts.length - 1],
      lowest: amounts[0],
      count: amounts.length,
    };
  }

  /**
   * Calculate month-over-month growth
   */
  getMoMGrowth(expenses: Expense[]): {
    currentMonth: number;
    previousMonth: number;
    growthPercentage: number;
    growthAmount: number;
  } {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = subMonths(currentMonthStart, 1);

    const currentMonthTotal = expenses
      .filter((e) => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= currentMonthStart;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const previousMonthTotal = expenses
      .filter((e) => {
        const expenseDate = parseISO(e.date);
        return expenseDate >= previousMonthStart && expenseDate < currentMonthStart;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const growthAmount = currentMonthTotal - previousMonthTotal;
    const growthPercentage =
      previousMonthTotal > 0 ? (growthAmount / previousMonthTotal) * 100 : 0;

    return {
      currentMonth: currentMonthTotal,
      previousMonth: previousMonthTotal,
      growthPercentage,
      growthAmount,
    };
  }

  /**
   * Get recurring vs one-time expense breakdown
   */
  getRecurringVsOneTime(expenses: Expense[]): {
    recurring: number;
    oneTime: number;
    recurringCount: number;
    oneTimeCount: number;
  } {
    let recurring = 0;
    let oneTime = 0;
    let recurringCount = 0;
    let oneTimeCount = 0;

    expenses.forEach((expense) => {
      if (expense.is_recurring) {
        recurring += expense.amount;
        recurringCount += 1;
      } else {
        oneTime += expense.amount;
        oneTimeCount += 1;
      }
    });

    return {
      recurring,
      oneTime,
      recurringCount,
      oneTimeCount,
    };
  }

  /**
   * Get tax deductible expense total
   */
  getTaxDeductibleTotal(expenses: Expense[]): {
    deductibleTotal: number;
    deductibleCount: number;
    deductiblePercentage: number;
  } {
    const deductibleExpenses = expenses.filter((e) => e.is_tax_deductible);
    const deductibleTotal = deductibleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const deductiblePercentage = total > 0 ? (deductibleTotal / total) * 100 : 0;

    return {
      deductibleTotal,
      deductibleCount: deductibleExpenses.length,
      deductiblePercentage,
    };
  }

  /**
   * Calculate monthly burn rate (average monthly spending)
   */
  getExpenseBurnRate(expenses: Expense[], months: number = 6): {
    burnRate: number;
    monthsAnalyzed: number;
  } {
    if (expenses.length === 0) {
      return { burnRate: 0, monthsAnalyzed: 0 };
    }

    const now = new Date();
    const startDate = subMonths(startOfMonth(now), months - 1);

    const recentExpenses = expenses.filter((e) => {
      const expenseDate = parseISO(e.date);
      return expenseDate >= startDate;
    });

    const total = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const burnRate = total / months;

    return {
      burnRate,
      monthsAnalyzed: months,
    };
  }
}

export const expenseAnalyticsService = new ExpenseAnalyticsService();
