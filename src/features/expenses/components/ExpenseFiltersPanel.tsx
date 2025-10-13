// src/features/expenses/components/ExpenseFiltersPanel.tsx

import React from 'react';
import {
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_FILTER_STYLES,
  EXPENSE_SPACING,
  EXPENSE_FONT_SIZES,
} from '../../../constants/expenses';
import type { AdvancedExpenseFilters } from '../../../types/expense.types';

export interface ExpenseFiltersPanelProps {
  filters: AdvancedExpenseFilters;
  onFiltersChange: (filters: AdvancedExpenseFilters) => void;
  categories: string[];
  resultCount: number;
}

/**
 * ExpenseFiltersPanel - Dark sidebar with filter controls
 *
 * Allows filtering expenses by type, category, search, and toggles.
 * Similar to dashboard's QuickStatsPanel dark sidebar styling.
 * Pure presentational component - receives filters and callback.
 */
export const ExpenseFiltersPanel: React.FC<ExpenseFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  categories,
  resultCount,
}) => {
  const handleFilterChange = (key: keyof AdvancedExpenseFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      expenseType: 'all',
      category: 'all',
      searchTerm: '',
    });
  };

  const hasActiveFilters =
    filters.expenseType !== 'all' ||
    filters.category !== 'all' ||
    filters.searchTerm !== '';

  return (
    <div
      style={{
        background: EXPENSE_FILTER_STYLES.PANEL_BG,
        borderRadius: EXPENSE_BORDER_RADIUS.LARGE,
        padding: '16px',
        boxShadow: EXPENSE_SHADOWS.SIDEBAR,
        color: EXPENSE_FILTER_STYLES.PANEL_TEXT,
        height: 'fit-content',
        position: 'sticky',
        top: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: EXPENSE_FONT_SIZES.SUBSECTION_HEADER,
          fontWeight: 600,
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #4a5568',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Filters
      </div>

      {/* Result Count */}
      <div
        style={{
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
          marginBottom: '16px',
          fontSize: EXPENSE_FONT_SIZES.FILTER_LABEL,
          textAlign: 'center',
        }}
      >
        <span style={{ fontWeight: 700, color: '#10b981' }}>{resultCount}</span>{' '}
        {resultCount === 1 ? 'expense' : 'expenses'} found
      </div>

      {/* Expense Type Filter */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: EXPENSE_FONT_SIZES.FILTER_LABEL,
            fontWeight: 600,
            color: EXPENSE_FILTER_STYLES.LABEL_COLOR,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Expense Type
        </label>
        <select
          value={filters.expenseType}
          onChange={(e) =>
            handleFilterChange(
              'expenseType',
              e.target.value as 'all' | 'personal' | 'business'
            )
          }
          style={{
            width: '100%',
            padding: '8px',
            background: EXPENSE_FILTER_STYLES.INPUT_BG,
            border: `1px solid ${EXPENSE_FILTER_STYLES.INPUT_BORDER}`,
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            color: EXPENSE_FILTER_STYLES.INPUT_TEXT,
            fontSize: EXPENSE_FONT_SIZES.FILTER_INPUT,
            cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: EXPENSE_FONT_SIZES.FILTER_LABEL,
            fontWeight: 600,
            color: EXPENSE_FILTER_STYLES.LABEL_COLOR,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Category
        </label>
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            background: EXPENSE_FILTER_STYLES.INPUT_BG,
            border: `1px solid ${EXPENSE_FILTER_STYLES.INPUT_BORDER}`,
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            color: EXPENSE_FILTER_STYLES.INPUT_TEXT,
            fontSize: EXPENSE_FONT_SIZES.FILTER_INPUT,
            cursor: 'pointer',
          }}
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: EXPENSE_FONT_SIZES.FILTER_LABEL,
            fontWeight: 600,
            color: EXPENSE_FILTER_STYLES.LABEL_COLOR,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Search
        </label>
        <input
          type="text"
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          placeholder="Search expenses..."
          style={{
            width: '100%',
            padding: '8px',
            background: EXPENSE_FILTER_STYLES.INPUT_BG,
            border: `1px solid ${EXPENSE_FILTER_STYLES.INPUT_BORDER}`,
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            color: EXPENSE_FILTER_STYLES.INPUT_TEXT,
            fontSize: EXPENSE_FONT_SIZES.FILTER_INPUT,
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor =
              EXPENSE_FILTER_STYLES.INPUT_FOCUS_BORDER;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor =
              EXPENSE_FILTER_STYLES.INPUT_BORDER;
          }}
        />
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          style={{
            width: '100%',
            padding: '8px',
            background: EXPENSE_FILTER_STYLES.BUTTON_BG,
            border: 'none',
            borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
            color: EXPENSE_FILTER_STYLES.BUTTON_TEXT,
            fontSize: EXPENSE_FONT_SIZES.BUTTON,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              EXPENSE_FILTER_STYLES.BUTTON_HOVER_BG;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = EXPENSE_FILTER_STYLES.BUTTON_BG;
          }}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};
