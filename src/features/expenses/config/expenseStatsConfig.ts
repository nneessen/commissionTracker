// src/features/expenses/config/expenseStatsConfig.ts

import { EXPENSE_COLORS } from '../../../constants/expenses';

export interface ExpenseTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  isPositive?: boolean; // For expenses, down is usually positive (spending less)
}

export interface ExpenseStatConfig {
  label: string;
  value: number | string;
  format: 'currency' | 'number' | 'percent';
  color: string;
  trend?: ExpenseTrend;
  icon?: string;
  tooltip?: string;
}

export interface GenerateExpenseStatsParams {
  totalAmount: number;
  expenseCount: number;
  momGrowth: {
    currentMonth: number;
    previousMonth: number;
    growthPercentage: number;
    growthAmount: number;
  };
  personalAmount: number;
  businessAmount: number;
  timePeriod: string;
}

/**
 * Generate expense stats configuration
 * Similar to dashboard's statsConfig pattern
 */
export const generateExpenseStatsConfig = ({
  totalAmount,
  expenseCount,
  momGrowth,
  personalAmount,
  businessAmount,
  timePeriod,
}: GenerateExpenseStatsParams): ExpenseStatConfig[] => {
  // Calculate trend direction
  const getTrendDirection = (
    percentChange: number
  ): 'up' | 'down' | 'neutral' => {
    if (Math.abs(percentChange) < 5) return 'neutral';
    return percentChange > 0 ? 'up' : 'down';
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral'): string => {
    if (direction === 'neutral') return EXPENSE_COLORS.GROWTH_NEUTRAL;
    // For expenses, down is good (spending less), up is bad (spending more)
    return direction === 'down'
      ? EXPENSE_COLORS.GROWTH_POSITIVE
      : EXPENSE_COLORS.GROWTH_NEGATIVE;
  };

  const trendDirection = getTrendDirection(momGrowth.growthPercentage);
  const trendColor = getTrendColor(trendDirection);

  return [
    {
      label: `Total Expenses`,
      value: totalAmount,
      format: 'currency',
      color: EXPENSE_COLORS.TOTAL,
      trend: {
        value: Math.abs(momGrowth.growthPercentage),
        direction: trendDirection,
        isPositive: trendDirection === 'down', // Spending less is positive
      },
      tooltip: `Month-over-month: ${momGrowth.growthPercentage >= 0 ? '+' : ''}${momGrowth.growthPercentage.toFixed(1)}%`,
    },
    {
      label: 'Business Expenses',
      value: businessAmount,
      format: 'currency',
      color: EXPENSE_COLORS.BUSINESS,
      tooltip: `${totalAmount > 0 ? ((businessAmount / totalAmount) * 100).toFixed(0) : 0}% of total`,
    },
    {
      label: 'Personal Expenses',
      value: personalAmount,
      format: 'currency',
      color: EXPENSE_COLORS.PERSONAL,
      tooltip: `${totalAmount > 0 ? ((personalAmount / totalAmount) * 100).toFixed(0) : 0}% of total`,
    },
    {
      label: 'Total Items',
      value: expenseCount,
      format: 'number',
      color: EXPENSE_COLORS.COUNT,
      tooltip: `Number of expense records`,
    },
  ];
};

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface GenerateCategoryBreakdownParams {
  expenses: Array<{ category: string; amount: number }>;
  totalAmount: number;
}

/**
 * Generate category breakdown configuration
 */
export const generateCategoryBreakdownConfig = ({
  expenses,
  totalAmount,
}: GenerateCategoryBreakdownParams): CategoryBreakdown[] => {
  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();

  expenses.forEach((expense) => {
    const existing = categoryMap.get(expense.category) || {
      amount: 0,
      count: 0,
    };
    categoryMap.set(expense.category, {
      amount: existing.amount + expense.amount,
      count: existing.count + 1,
    });
  });

  // Convert to array and sort by amount
  const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data], index) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      color:
        EXPENSE_COLORS.CATEGORIES[index % EXPENSE_COLORS.CATEGORIES.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  return breakdown;
};

export interface MonthlyTrendData {
  month: string; // e.g., "Jan", "Feb"
  amount: number;
  count: number;
  isCurrentMonth?: boolean;
}

export interface GenerateTrendDataParams {
  expenses: Array<{ date: Date | string; amount: number }>;
  months: number; // How many months to show (e.g., 6 or 12)
}

/**
 * Generate monthly trend data for chart
 */
export const generateTrendData = ({
  expenses,
  months,
}: GenerateTrendDataParams): MonthlyTrendData[] => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Initialize array for last N months
  const trendData: MonthlyTrendData[] = [];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const displayMonth =
      year === currentYear ? monthName : `${monthName} '${year.toString().slice(2)}`;

    trendData.push({
      month: displayMonth,
      amount: 0,
      count: 0,
      isCurrentMonth: i === 0,
    });
  }

  // Aggregate expenses by month
  expenses.forEach((expense) => {
    const expenseDate = new Date(expense.date);
    const monthsAgo =
      (currentYear - expenseDate.getFullYear()) * 12 +
      (currentMonth - expenseDate.getMonth());

    if (monthsAgo >= 0 && monthsAgo < months) {
      const index = months - 1 - monthsAgo;
      trendData[index].amount += expense.amount;
      trendData[index].count += 1;
    }
  });

  return trendData;
};
