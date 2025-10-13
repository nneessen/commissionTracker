// src/features/expenses/components/ExpenseListCard.tsx

import React from 'react';
import {
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_FONT_SIZES,
  EXPENSE_SPACING,
  EXPENSE_TYPOGRAPHY,
  EXPENSE_TABLE_STYLES,
  EXPENSE_ICON_SIZES,
} from '../../../constants/expenses';
import { formatCurrency } from '../../../utils/formatting';
import { getCategoryColorWithDefaults } from '../config/expenseColorsConfig';
import type { Expense } from '../../../types/expense.types';

export interface ExpenseListCardProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  isLoading?: boolean;
  limit?: number;
}

/**
 * ExpenseListCard - Table of expenses
 *
 * Displays expenses in a table with edit/delete actions.
 * Similar to dashboard's PerformanceOverviewCard table styling.
 * Pure presentational component.
 */
export const ExpenseListCard: React.FC<ExpenseListCardProps> = ({
  expenses,
  onEdit,
  onDelete,
  isLoading = false,
  limit,
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
          Recent Expenses
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading expenses...
        </div>
      </div>
    );
  }

  const displayExpenses = limit ? expenses.slice(0, limit) : expenses;
  const allCategories = Array.from(new Set(expenses.map((e) => e.category)));

  if (displayExpenses.length === 0) {
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
          Recent Expenses
        </div>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: EXPENSE_TABLE_STYLES.EMPTY_STATE_TEXT,
          }}
        >
          No expenses found. Add your first expense to get started!
        </div>
      </div>
    );
  }

  const formatDate = (dateString: Date | string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
        Recent Expenses
        {limit && expenses.length > limit && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
              fontWeight: EXPENSE_TYPOGRAPHY.DEFAULT_FONT_WEIGHT,
              color: '#656d76',
              textTransform: 'none',
            }}
          >
            (showing {limit} of {expenses.length})
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            fontSize: EXPENSE_FONT_SIZES.TABLE_CELL,
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `2px solid ${EXPENSE_TABLE_STYLES.HEADER_BORDER}`,
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Date
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Name
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Category
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Amount
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Type
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  fontWeight: 600,
                  color: EXPENSE_TABLE_STYLES.HEADER_TEXT,
                  textTransform: 'uppercase',
                  fontSize: EXPENSE_FONT_SIZES.TABLE_HEADER,
                  letterSpacing: '0.5px',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayExpenses.map((expense) => {
              const categoryColor = getCategoryColorWithDefaults(
                expense.category,
                allCategories
              );

              return (
                <tr
                  key={expense.id}
                  style={{
                    borderBottom: `1px solid ${EXPENSE_TABLE_STYLES.ROW_BORDER}`,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      EXPENSE_TABLE_STYLES.ROW_HOVER_BG;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Date */}
                  <td
                    style={{
                      padding: '12px 4px',
                      color: EXPENSE_TABLE_STYLES.CELL_TEXT_SECONDARY,
                      fontSize: EXPENSE_FONT_SIZES.TABLE_CELL,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(expense.date)}
                  </td>

                  {/* Name */}
                  <td
                    style={{
                      padding: '12px 4px',
                      color: EXPENSE_TABLE_STYLES.CELL_TEXT,
                      fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
                    }}
                  >
                    {expense.name}
                  </td>

                  {/* Category */}
                  <td style={{ padding: '12px 4px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        background: `${categoryColor}15`,
                        color: categoryColor,
                        borderRadius: EXPENSE_BORDER_RADIUS.XSMALL,
                        fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                        fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
                      }}
                    >
                      {expense.category}
                    </span>
                  </td>

                  {/* Amount */}
                  <td
                    style={{
                      padding: '12px 4px',
                      textAlign: 'right',
                      fontFamily: EXPENSE_TYPOGRAPHY.MONO_FONT,
                      fontWeight: EXPENSE_TYPOGRAPHY.BOLD_FONT_WEIGHT,
                      color: EXPENSE_TABLE_STYLES.CELL_TEXT,
                    }}
                  >
                    {formatCurrency(expense.amount)}
                  </td>

                  {/* Type */}
                  <td
                    style={{
                      padding: '12px 4px',
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                        color: EXPENSE_TABLE_STYLES.CELL_TEXT_SECONDARY,
                        textTransform: 'capitalize',
                      }}
                    >
                      {expense.expense_type}
                    </span>
                  </td>

                  {/* Actions */}
                  <td
                    style={{
                      padding: '12px 4px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(expense)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: `1px solid ${EXPENSE_TABLE_STYLES.HEADER_BORDER}`,
                          borderRadius: EXPENSE_BORDER_RADIUS.XSMALL,
                          color: EXPENSE_TABLE_STYLES.CELL_TEXT_SECONDARY,
                          fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            EXPENSE_TABLE_STYLES.ACTION_BUTTON_HOVER;
                          e.currentTarget.style.color =
                            EXPENSE_TABLE_STYLES.ACTION_BUTTON_HOVER;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            EXPENSE_TABLE_STYLES.HEADER_BORDER;
                          e.currentTarget.style.color =
                            EXPENSE_TABLE_STYLES.CELL_TEXT_SECONDARY;
                        }}
                        title="Edit expense"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(expense)}
                        style={{
                          padding: '4px 8px',
                          background: 'transparent',
                          border: '1px solid #fed7aa',
                          borderRadius: EXPENSE_BORDER_RADIUS.XSMALL,
                          color: '#ea580c',
                          fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#fed7aa';
                          e.currentTarget.style.color = '#ea580c';
                        }}
                        title="Delete expense"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show more indicator */}
      {limit && expenses.length > limit && (
        <div
          style={{
            marginTop: '16px',
            padding: '8px',
            background: '#f8f9fa',
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            textAlign: 'center',
            fontSize: EXPENSE_FONT_SIZES.STAT_LABEL,
            color: '#656d76',
          }}
        >
          + {expenses.length - limit} more {expenses.length - limit === 1 ? 'expense' : 'expenses'}
        </div>
      )}
    </div>
  );
};
