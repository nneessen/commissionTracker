// src/features/expenses/components/ExpenseBreakdownCard.tsx

import React from 'react';
import {
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_FONT_SIZES,
  EXPENSE_SPACING,
  EXPENSE_TYPOGRAPHY,
} from '../../../constants/expenses';
import { formatCurrency } from '../../../utils/formatting';
import type { CategoryBreakdown } from '../config/expenseStatsConfig';

export interface ExpenseBreakdownCardProps {
  categoryData: CategoryBreakdown[];
  isLoading?: boolean;
}

/**
 * ExpenseBreakdownCard - Category breakdown visualization
 *
 * Shows spending by category with horizontal bar chart.
 * Similar to analytics card styling.
 * Pure presentational component.
 */
export const ExpenseBreakdownCard: React.FC<ExpenseBreakdownCardProps> = ({
  categoryData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: EXPENSE_BORDER_RADIUS.LARGE,
          padding: EXPENSE_SPACING.CARD_PADDING,
          boxShadow: EXPENSE_SHADOWS.CARD,
        }}
      >
        <div
          style={{
            fontSize: EXPENSE_FONT_SIZES.SECTION_HEADER,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Spending by Category
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (categoryData.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: EXPENSE_BORDER_RADIUS.LARGE,
          padding: EXPENSE_SPACING.CARD_PADDING,
          boxShadow: EXPENSE_SHADOWS.CARD,
        }}
      >
        <div
          style={{
            fontSize: EXPENSE_FONT_SIZES.SECTION_HEADER,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Spending by Category
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No expense data available
        </div>
      </div>
    );
  }

  // Take top 8 categories
  const topCategories = categoryData.slice(0, 8);
  const maxAmount = Math.max(...topCategories.map((c) => c.amount));

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: EXPENSE_BORDER_RADIUS.LARGE,
        padding: EXPENSE_SPACING.CARD_PADDING,
        boxShadow: EXPENSE_SHADOWS.CARD,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: EXPENSE_FONT_SIZES.SECTION_HEADER,
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Spending by Category
      </div>

      {/* Category List with Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {topCategories.map((category) => {
          const barWidth = maxAmount > 0 ? (category.amount / maxAmount) * 100 : 0;

          return (
            <div key={category.category}>
              {/* Category Name and Amount */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: EXPENSE_FONT_SIZES.TABLE_CELL,
                    fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
                    color: '#1a1a1a',
                  }}
                >
                  {category.category}
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                      color: '#656d76',
                      fontWeight: EXPENSE_TYPOGRAPHY.DEFAULT_FONT_WEIGHT,
                    }}
                  >
                    ({category.count})
                  </span>
                </div>
                <div
                  style={{
                    fontSize: EXPENSE_FONT_SIZES.TABLE_CELL,
                    fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
                    color: category.color,
                    fontFamily: EXPENSE_TYPOGRAPHY.MONO_FONT,
                  }}
                >
                  {formatCurrency(category.amount)}
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '8px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: category.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Percentage */}
              <div
                style={{
                  fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                  color: '#656d76',
                  marginTop: '2px',
                }}
              >
                {category.percentage.toFixed(1)}% of total
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator if there are more categories */}
      {categoryData.length > 8 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            background: '#f8f9fa',
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            textAlign: 'center',
            fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
            color: '#656d76',
          }}
        >
          + {categoryData.length - 8} more {categoryData.length - 8 === 1 ? 'category' : 'categories'}
        </div>
      )}
    </div>
  );
};
