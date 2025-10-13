// src/features/expenses/components/ExpenseStatsPanel.tsx

import React from 'react';
import { ExpenseStatItem } from './ExpenseStatItem';
import { EXPENSE_LAYOUT, EXPENSE_SPACING } from '../../../constants/expenses';
import type { ExpenseStatConfig } from '../config/expenseStatsConfig';

export interface ExpenseStatsPanelProps {
  stats: ExpenseStatConfig[];
  isLoading?: boolean;
}

/**
 * ExpenseStatsPanel - Grid of stat cards
 *
 * Displays key expense metrics in a responsive grid.
 * Uses ExpenseStatItem for each metric.
 * Pure presentational component - receives stats as props.
 */
export const ExpenseStatsPanel: React.FC<ExpenseStatsPanelProps> = ({
  stats,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: EXPENSE_LAYOUT.STATS_GRID,
          gap: EXPENSE_SPACING.CARD_GAP,
          marginBottom: EXPENSE_SPACING.SECTION_GAP,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '20px',
              height: '100px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                height: '12px',
                background: '#e5e7eb',
                borderRadius: '4px',
                marginBottom: '12px',
                width: '60%',
              }}
            />
            <div
              style={{
                height: '24px',
                background: '#e5e7eb',
                borderRadius: '4px',
                width: '80%',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: EXPENSE_LAYOUT.STATS_GRID,
        gap: EXPENSE_SPACING.CARD_GAP,
        marginBottom: EXPENSE_SPACING.SECTION_GAP,
      }}
    >
      {stats.map((stat, index) => (
        <ExpenseStatItem key={index} stat={stat} />
      ))}
    </div>
  );
};
