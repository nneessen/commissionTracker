// src/features/expenses/components/ExpenseHeader.tsx

import React from 'react';
import {
  EXPENSE_FONT_SIZES,
  EXPENSE_SPACING,
  EXPENSE_BORDER_RADIUS,
  EXPENSE_SHADOWS,
  EXPENSE_EXPORT_BUTTONS,
  EXPENSE_ICON_SIZES,
} from '../../../constants/expenses';

export interface ExpenseHeaderProps {
  title?: string;
  subtitle?: string;
  onExportCSV: () => void;
  onExportPDF?: () => void;
  expenseCount: number;
}

/**
 * ExpenseHeader - Page header with title and export controls
 *
 * Displays page title, subtitle, and export buttons.
 * Pure presentational component.
 */
export const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({
  title = 'Expenses',
  subtitle = 'Track and analyze your personal and business expenses',
  onExportCSV,
  onExportPDF,
  expenseCount,
}) => {
  return (
    <div
      style={{
        marginBottom: EXPENSE_SPACING.SECTION_GAP,
      }}
    >
      {/* Title and Description */}
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: EXPENSE_FONT_SIZES.PAGE_TITLE,
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: '8px',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: EXPENSE_FONT_SIZES.PAGE_SUBTITLE,
            color: '#656d76',
            margin: 0,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Export Controls */}
      <div
        style={{
          padding: '16px',
          background: '#ffffff',
          borderRadius: EXPENSE_BORDER_RADIUS.MEDIUM,
          boxShadow: EXPENSE_SHADOWS.CARD,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1a1a1a',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Export Data
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              fontWeight: 500,
              color: '#656d76',
              textTransform: 'none',
            }}
          >
            ({expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'})
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* CSV Export Button */}
          <button
            onClick={onExportCSV}
            disabled={expenseCount === 0}
            style={{
              padding: '6px 12px',
              background:
                expenseCount === 0 ? '#d1d5db' : EXPENSE_EXPORT_BUTTONS.CSV_BG,
              color: EXPENSE_EXPORT_BUTTONS.TEXT_COLOR,
              border: 'none',
              borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
              fontSize: EXPENSE_FONT_SIZES.BUTTON,
              fontWeight: 600,
              cursor: expenseCount === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: expenseCount === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (expenseCount > 0) {
                e.currentTarget.style.background =
                  EXPENSE_EXPORT_BUTTONS.CSV_HOVER_BG;
                e.currentTarget.style.boxShadow = EXPENSE_SHADOWS.BUTTON_HOVER;
              }
            }}
            onMouseLeave={(e) => {
              if (expenseCount > 0) {
                e.currentTarget.style.background = EXPENSE_EXPORT_BUTTONS.CSV_BG;
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
            title={
              expenseCount === 0
                ? 'No expenses to export'
                : 'Export expenses to CSV'
            }
          >
            <span style={{ fontSize: '14px' }}>📊</span>
            Export CSV
          </button>

          {/* PDF Export Button (optional) */}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              disabled={expenseCount === 0}
              style={{
                padding: '6px 12px',
                background:
                  expenseCount === 0 ? '#d1d5db' : EXPENSE_EXPORT_BUTTONS.PDF_BG,
                color: EXPENSE_EXPORT_BUTTONS.TEXT_COLOR,
                border: 'none',
                borderRadius: EXPENSE_BORDER_RADIUS.SMALL,
                fontSize: EXPENSE_FONT_SIZES.BUTTON,
                fontWeight: 600,
                cursor: expenseCount === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: expenseCount === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (expenseCount > 0) {
                  e.currentTarget.style.background =
                    EXPENSE_EXPORT_BUTTONS.PDF_HOVER_BG;
                  e.currentTarget.style.boxShadow = EXPENSE_SHADOWS.BUTTON_HOVER;
                }
              }}
              onMouseLeave={(e) => {
                if (expenseCount > 0) {
                  e.currentTarget.style.background =
                    EXPENSE_EXPORT_BUTTONS.PDF_BG;
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              title={
                expenseCount === 0
                  ? 'No expenses to export'
                  : 'Print expenses to PDF'
              }
            >
              <span style={{ fontSize: '14px' }}>📄</span>
              Print PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
