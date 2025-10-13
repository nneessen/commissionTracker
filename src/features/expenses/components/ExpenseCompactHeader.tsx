// src/features/expenses/components/ExpenseCompactHeader.tsx

import React from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export interface ExpenseCompactHeaderProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  totalAmount: number;
  businessAmount: number;
  personalAmount: number;
  itemCount: number;
  onExportCSV: () => void;
  isLoading?: boolean;
}

/**
 * ExpenseCompactHeader - Inline header with month navigation and metrics
 *
 * Replaces the generic 4-card layout with a compact, data-dense header.
 * Shows all key metrics in a single row with month navigation.
 */
export function ExpenseCompactHeader({
  selectedMonth,
  onMonthChange,
  totalAmount,
  businessAmount,
  personalAmount,
  itemCount,
  onExportCSV,
  isLoading = false,
}: ExpenseCompactHeaderProps) {
  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePreviousMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  if (isLoading) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: '16px 24px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            height: '24px',
            background: '#f3f4f6',
            borderRadius: '4px',
            width: '300px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: '16px 24px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top Row: Title, Month Navigation, Export */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: 0,
          }}
        >
          EXPENSES
        </h2>

        {/* Month Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            onClick={handlePreviousMonth}
            style={{
              padding: '6px 10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="Previous month"
          >
            <ChevronLeft style={{ width: '16px', height: '16px', color: '#64748b' }} />
          </button>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#1a1a1a',
              minWidth: '140px',
              textAlign: 'center',
            }}
          >
            {monthYear}
          </div>

          <button
            onClick={handleNextMonth}
            style={{
              padding: '6px 10px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="Next month"
          >
            <ChevronRight style={{ width: '16px', height: '16px', color: '#64748b' }} />
          </button>

          <button
            onClick={handleToday}
            style={{
              padding: '6px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Today
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={onExportCSV}
          style={{
            padding: '8px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#cbd5e0';
            e.currentTarget.style.color = '#475569';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <Download style={{ width: '14px', height: '14px' }} />
          Export
        </button>
      </div>

      {/* Bottom Row: Inline Metrics */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          fontSize: '13px',
          color: '#64748b',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💰 Total:</span>
          <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
            ${totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Business */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🏢 Business:</span>
          <span style={{ fontWeight: 600, color: '#10b981' }}>
            ${businessAmount.toFixed(2)}
          </span>
        </div>

        {/* Personal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🏠 Personal:</span>
          <span style={{ fontWeight: 600, color: '#6366f1' }}>
            ${personalAmount.toFixed(2)}
          </span>
        </div>

        {/* Item Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📊</span>
          <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>
    </div>
  );
}
