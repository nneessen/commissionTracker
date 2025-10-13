// src/features/expenses/components/ExpensePageHeader.tsx

import React from 'react';

interface ExpensePageHeaderProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

/**
 * ExpensePageHeader - Simple page title, subtitle, and month navigation
 * Matches Analytics page pattern
 */
export function ExpensePageHeader({ selectedMonth, onMonthChange }: ExpensePageHeaderProps) {
  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Title and Subtitle */}
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '8px',
        }}
      >
        Expenses
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#656d76',
          marginBottom: '20px',
        }}
      >
        Track and manage business and personal expenses
      </p>

      {/* Month Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <button
          onClick={handlePrevMonth}
          style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
          title="Previous month"
        >
          ◄
        </button>

        <div
          style={{
            flex: 1,
            fontSize: '15px',
            fontWeight: 600,
            color: '#1a1a1a',
            textAlign: 'center',
          }}
        >
          {monthYear}
        </div>

        <button
          onClick={handleToday}
          style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
          title="Go to current month"
        >
          Today
        </button>

        <button
          onClick={handleNextMonth}
          style={{
            padding: '6px 12px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
          title="Next month"
        >
          ►
        </button>
      </div>
    </div>
  );
}
