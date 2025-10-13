// src/features/expenses/components/RecurringGenerationBanner.tsx

import React, { useState, useMemo } from 'react';
import type { ExpenseTemplate } from '../../../types/expense.types';

interface RecurringGenerationBannerProps {
  templates: ExpenseTemplate[];
  selectedMonth: Date;
  expenses: Array<{ recurring_group_id?: string | null; date: string }>;
  onGenerate: () => void;
  isGenerating: boolean;
}

/**
 * RecurringGenerationBanner - Smart contextual banner for recurring expense generation
 *
 * Only displays when:
 * 1. User has recurring templates (is_recurring = true)
 * 2. Those templates haven't been generated yet for the selected month
 *
 * Shows clear information about what will happen and allows dismissal
 */
export function RecurringGenerationBanner({
  templates,
  selectedMonth,
  expenses,
  onGenerate,
  isGenerating,
}: RecurringGenerationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate which recurring templates need generation for this month
  const needsGeneration = useMemo(() => {
    // Filter to only recurring templates (templates with a recurring_frequency set)
    const recurringTemplates = templates.filter((t) => t.recurring_frequency !== null);

    if (recurringTemplates.length === 0) {
      return { count: 0, templates: [] };
    }

    // Check if expenses already exist for this month with recurring_group_id
    const selectedMonthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const selectedMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

    const recurringExpensesThisMonth = expenses.filter((expense) => {
      if (!expense.recurring_group_id) return false;

      const expenseDate = new Date(expense.date);
      return expenseDate >= selectedMonthStart && expenseDate <= selectedMonthEnd;
    });

    // If we have recurring expenses for this month, don't show banner
    if (recurringExpensesThisMonth.length > 0) {
      return { count: 0, templates: [] };
    }

    return {
      count: recurringTemplates.length,
      templates: recurringTemplates,
    };
  }, [templates, selectedMonth, expenses]);

  // Don't show banner if:
  // - No recurring templates need generation
  // - User dismissed it
  if (needsGeneration.count === 0 || isDismissed) {
    return null;
  }

  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        ⚡
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#92400e',
            marginBottom: '4px',
          }}
        >
          Recurring Expenses Not Generated
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#78350f',
            lineHeight: '1.5',
          }}
        >
          You have <strong>{needsGeneration.count}</strong> recurring expense template
          {needsGeneration.count > 1 ? 's' : ''} that haven't been generated for{' '}
          <strong>{monthYear}</strong>.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          style={{
            padding: '8px 16px',
            background: isGenerating ? '#94a3b8' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = '#10b981';
            }
          }}
        >
          {isGenerating
            ? 'Generating...'
            : `Generate ${needsGeneration.count} Expense${needsGeneration.count > 1 ? 's' : ''}`}
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          disabled={isGenerating}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            color: '#78350f',
            border: '1px solid #d97706',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = 'rgba(217, 119, 6, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Dismiss for this session"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
