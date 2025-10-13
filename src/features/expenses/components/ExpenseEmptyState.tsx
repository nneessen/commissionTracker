// src/features/expenses/components/ExpenseEmptyState.tsx

import React from 'react';

type EmptyStateType = 'no-expenses' | 'no-results' | 'no-templates';

interface ExpenseEmptyStateProps {
  type: EmptyStateType;
  onAddExpense?: () => void;
  onClearFilters?: () => void;
  selectedMonth?: Date;
}

/**
 * ExpenseEmptyState - Various empty state scenarios with helpful actions
 *
 * Scenarios:
 * - no-expenses: No expenses for the selected month
 * - no-results: Expenses exist but filters exclude them all
 * - no-templates: No expense templates created yet
 */
export function ExpenseEmptyState({
  type,
  onAddExpense,
  onClearFilters,
  selectedMonth,
}: ExpenseEmptyStateProps) {
  const monthYear = selectedMonth
    ? selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const configs = {
    'no-expenses': {
      icon: '📭',
      title: 'No Expenses Yet',
      description: `You haven't recorded any expenses for ${monthYear}.`,
      actionLabel: 'Add First Expense',
      action: onAddExpense,
    },
    'no-results': {
      icon: '🔍',
      title: 'No Matching Expenses',
      description: 'No expenses match your current filters. Try adjusting your search criteria.',
      actionLabel: 'Clear Filters',
      action: onClearFilters,
    },
    'no-templates': {
      icon: '⭐',
      title: 'No Templates Yet',
      description:
        'Create expense templates for recurring expenses like rent, subscriptions, or utilities. Templates let you add expenses with one click.',
      actionLabel: 'Add Expense to Create Template',
      action: onAddExpense,
    },
  };

  const config = configs[type];

  return (
    <div
      style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
      >
        {config.icon}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '8px',
        }}
      >
        {config.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          maxWidth: '400px',
          margin: '0 auto 24px',
          lineHeight: '1.6',
        }}
      >
        {config.description}
      </p>

      {/* Action Button */}
      {config.action && (
        <button
          onClick={config.action}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {config.actionLabel}
        </button>
      )}
    </div>
  );
}
