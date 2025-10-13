// src/features/expenses/components/ExpenseTrendCard.tsx

import React from 'react';
import {
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_FONT_SIZES,
  EXPENSE_SPACING,
  EXPENSE_TYPOGRAPHY,
  EXPENSE_COLORS,
} from '../../../constants/expenses';
import { formatCurrency } from '../../../utils/formatting';
import type { MonthlyTrendData } from '../config/expenseStatsConfig';

export interface ExpenseTrendCardProps {
  trendData: MonthlyTrendData[];
  isLoading?: boolean;
}

/**
 * ExpenseTrendCard - Monthly trend visualization
 *
 * Shows spending trend over time with simple bar chart.
 * Similar to analytics visualization style.
 * Pure presentational component.
 */
export const ExpenseTrendCard: React.FC<ExpenseTrendCardProps> = ({
  trendData,
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
          Monthly Trend
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
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
          Monthly Trend
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No trend data available
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...trendData.map((d) => d.amount), 1);
  const totalAmount = trendData.reduce((sum, d) => sum + d.amount, 0);
  const avgAmount = totalAmount / trendData.length;

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
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: EXPENSE_FONT_SIZES.SECTION_HEADER,
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Monthly Trend
        </div>
        <div
          style={{
            fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
            color: '#656d76',
          }}
        >
          Last {trendData.length} months • Avg: {formatCurrency(avgAmount)}/mo
        </div>
      </div>

      {/* Bar Chart */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '4px',
          height: '120px',
          marginBottom: '12px',
        }}
      >
        {trendData.map((data, index) => {
          const barHeight = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0;
          const isCurrentMonth = data.isCurrentMonth;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
              }}
              title={`${data.month}: ${formatCurrency(data.amount)} (${data.count} expenses)`}
            >
              {/* Bar */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${barHeight}%`,
                    background: isCurrentMonth
                      ? EXPENSE_COLORS.TOTAL
                      : data.amount > avgAmount
                        ? EXPENSE_COLORS.GROWTH_NEGATIVE
                        : EXPENSE_COLORS.GROWTH_POSITIVE,
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    opacity: isCurrentMonth ? 1 : 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Month Labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '4px',
        }}
      >
        {trendData.map((data, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              color: data.isCurrentMonth ? '#1a1a1a' : '#656d76',
              fontWeight: data.isCurrentMonth
                ? EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT
                : EXPENSE_TYPOGRAPHY.DEFAULT_FONT_WEIGHT,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.month}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: EXPENSE_COLORS.TOTAL,
              borderRadius: '2px',
            }}
          />
          <span
            style={{
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              color: '#656d76',
            }}
          >
            Current
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: EXPENSE_COLORS.GROWTH_POSITIVE,
              borderRadius: '2px',
              opacity: 0.7,
            }}
          />
          <span
            style={{
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              color: '#656d76',
            }}
          >
            Below Avg
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: EXPENSE_COLORS.GROWTH_NEGATIVE,
              borderRadius: '2px',
              opacity: 0.7,
            }}
          />
          <span
            style={{
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              color: '#656d76',
            }}
          >
            Above Avg
          </span>
        </div>
      </div>
    </div>
  );
};
