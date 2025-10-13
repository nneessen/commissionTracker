// src/features/expenses/config/expenseColorsConfig.ts

import { EXPENSE_COLORS } from '../../../constants/expenses';

/**
 * Maps expense categories to consistent colors
 * Ensures the same category always gets the same color
 */
export const getCategoryColor = (category: string, allCategories: string[]): string => {
  const index = allCategories.indexOf(category);
  if (index === -1) {
    // Fallback to hash-based color if category not found
    return EXPENSE_COLORS.CATEGORIES[
      Math.abs(hashString(category)) % EXPENSE_COLORS.CATEGORIES.length
    ];
  }
  return EXPENSE_COLORS.CATEGORIES[index % EXPENSE_COLORS.CATEGORIES.length];
};

/**
 * Simple string hash function for consistent color assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Get color for expense type
 */
export const getExpenseTypeColor = (
  type: 'personal' | 'business' | 'all'
): string => {
  switch (type) {
    case 'personal':
      return EXPENSE_COLORS.PERSONAL;
    case 'business':
      return EXPENSE_COLORS.BUSINESS;
    default:
      return EXPENSE_COLORS.TOTAL;
  }
};

/**
 * Get color for trend direction
 * Note: For expenses, down is good (spending less)
 */
export const getTrendColor = (
  direction: 'up' | 'down' | 'neutral',
  isExpense: boolean = true
): string => {
  if (direction === 'neutral') return EXPENSE_COLORS.GROWTH_NEUTRAL;

  if (isExpense) {
    // For expenses: down = good (green), up = bad (red)
    return direction === 'down'
      ? EXPENSE_COLORS.GROWTH_POSITIVE
      : EXPENSE_COLORS.GROWTH_NEGATIVE;
  } else {
    // For income: up = good (green), down = bad (red)
    return direction === 'up'
      ? EXPENSE_COLORS.GROWTH_POSITIVE
      : EXPENSE_COLORS.GROWTH_NEGATIVE;
  }
};

/**
 * Get trend symbol
 */
export const getTrendSymbol = (direction: 'up' | 'down' | 'neutral'): string => {
  switch (direction) {
    case 'up':
      return '▲';
    case 'down':
      return '▼';
    default:
      return '━';
  }
};

/**
 * Default category color mappings for common expense categories
 * This ensures common categories always get consistent, recognizable colors
 */
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  // Common business categories
  'Marketing': EXPENSE_COLORS.CATEGORIES[0], // Blue
  'Office Supplies': EXPENSE_COLORS.CATEGORIES[1], // Green
  'Software': EXPENSE_COLORS.CATEGORIES[2], // Amber
  'Travel': EXPENSE_COLORS.CATEGORIES[3], // Red
  'Meals': EXPENSE_COLORS.CATEGORIES[4], // Purple
  'Insurance': EXPENSE_COLORS.CATEGORIES[5], // Pink
  'Professional Services': EXPENSE_COLORS.CATEGORIES[6], // Cyan
  'Equipment': EXPENSE_COLORS.CATEGORIES[7], // Teal
  'Rent': EXPENSE_COLORS.CATEGORIES[8], // Orange
  'Utilities': EXPENSE_COLORS.CATEGORIES[9], // Violet

  // Common personal categories
  'Housing': EXPENSE_COLORS.CATEGORIES[8], // Orange
  'Transportation': EXPENSE_COLORS.CATEGORIES[3], // Red
  'Food': EXPENSE_COLORS.CATEGORIES[4], // Purple
  'Healthcare': EXPENSE_COLORS.CATEGORIES[5], // Pink
  'Entertainment': EXPENSE_COLORS.CATEGORIES[0], // Blue
  'Shopping': EXPENSE_COLORS.CATEGORIES[2], // Amber
  'Personal Care': EXPENSE_COLORS.CATEGORIES[1], // Green
  'Education': EXPENSE_COLORS.CATEGORIES[6], // Cyan
  'Subscriptions': EXPENSE_COLORS.CATEGORIES[7], // Teal
  'Other': EXPENSE_COLORS.GROWTH_NEUTRAL, // Slate
};

/**
 * Get category color with fallback to default mappings
 */
export const getCategoryColorWithDefaults = (
  category: string,
  allCategories: string[]
): string => {
  // Check if we have a default mapping for this category
  if (DEFAULT_CATEGORY_COLORS[category]) {
    return DEFAULT_CATEGORY_COLORS[category];
  }

  // Otherwise use the standard getCategoryColor
  return getCategoryColor(category, allCategories);
};
