// src/features/expenses/components/ExpenseStatItem.tsx

import React from 'react';
import {
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_FONT_SIZES,
  EXPENSE_SPACING,
  EXPENSE_TYPOGRAPHY,
} from '../../../constants/expenses';
import { formatCurrency, formatPercent } from '../../../utils/formatting';
import { getTrendSymbol, getTrendColor } from '../config/expenseColorsConfig';
import type { ExpenseStatConfig } from '../config/expenseStatsConfig';

export interface ExpenseStatItemProps {
  stat: ExpenseStatConfig;
}

/**
 * ExpenseStatItem - Displays a single stat/metric
 *
 * Simple, reusable component for showing key metrics like
 * total expenses, deductible amount, counts, etc.
 *
 * Props come from parent, no data fetching.
 */
export const ExpenseStatItem: React.FC<ExpenseStatItemProps> = ({ stat }) => {
  const formatValue = (value: number | string, format: string): string => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'number':
        return value.toLocaleString();
      default:
        return String(value);
    }
  };

  const formattedValue = formatValue(stat.value, stat.format);

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: EXPENSE_BORDER_RADIUS.MEDIUM,
        padding: EXPENSE_SPACING.CARD_PADDING,
        boxShadow: EXPENSE_SHADOWS.CARD,
        borderLeft: `4px solid ${stat.color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: EXPENSE_SPACING.ITEM_GAP,
        position: 'relative',
      }}
      title={stat.tooltip}
    >
      {/* Label */}
      <div
        style={{
          fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
          fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
          color: '#656d76',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {stat.label}
      </div>

      {/* Value and Trend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: EXPENSE_SPACING.ITEM_GAP,
        }}
      >
        <div
          style={{
            fontSize: EXPENSE_FONT_SIZES.STAT_VALUE_LARGE,
            fontWeight: EXPENSE_TYPOGRAPHY.HEAVY_FONT_WEIGHT,
            color: '#1a1a1a',
            fontFamily: EXPENSE_TYPOGRAPHY.MONO_FONT,
          }}
        >
          {formattedValue}
        </div>

        {/* Trend Indicator */}
        {stat.trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
              color: getTrendColor(stat.trend.direction, true),
            }}
          >
            <span>{getTrendSymbol(stat.trend.direction)}</span>
            <span>{stat.trend.value.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Icon (optional) */}
      {stat.icon && (
        <div
          style={{
            position: 'absolute',
            top: EXPENSE_SPACING.CARD_PADDING,
            right: EXPENSE_SPACING.CARD_PADDING,
            fontSize: '24px',
            opacity: 0.2,
          }}
        >
          {stat.icon}
        </div>
      )}
    </div>
  );
};
