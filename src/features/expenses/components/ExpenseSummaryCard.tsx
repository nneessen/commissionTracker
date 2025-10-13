// src/features/expenses/components/ExpenseSummaryCard.tsx

import React from 'react';

interface ExpenseSummaryCardProps {
  totalAmount: number;
  businessAmount: number;
  personalAmount: number;
  itemCount: number;
  momGrowth: number;
  onExportCSV: () => void;
  isLoading?: boolean;
}

/**
 * ExpenseSummaryCard - Single consolidated card for all expense metrics
 * Replaces the scattered inline metrics from ExpenseCompactHeader
 */
export function ExpenseSummaryCard({
  totalAmount,
  businessAmount,
  personalAmount,
  itemCount,
  momGrowth,
  onExportCSV,
  isLoading = false,
}: ExpenseSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    const sign = growth > 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const growthColor = momGrowth > 0 ? '#ef4444' : momGrowth < 0 ? '#10b981' : '#64748b';
  const growthIcon = momGrowth > 0 ? '↑' : momGrowth < 0 ? '↓' : '→';

  if (isLoading) {
    return (
      <div
        style={{
          padding: '20px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '16px',
        }}
      >
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>Loading summary...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Summary
        </div>
        <button
          onClick={onExportCSV}
          style={{
            padding: '6px 12px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#059669';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#10b981';
          }}
          title="Export expenses to CSV"
        >
          📊 Export CSV
        </button>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Amount */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            TOTAL
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>

        {/* Business */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            BUSINESS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#3b82f6' }}>
            {formatCurrency(businessAmount)}
          </div>
        </div>

        {/* Personal */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            PERSONAL
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#8b5cf6' }}>
            {formatCurrency(personalAmount)}
          </div>
        </div>

        {/* Item Count */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            ITEMS
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>
            {itemCount}
          </div>
        </div>

        {/* MoM Growth */}
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
            VS LAST MONTH
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: growthColor,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{growthIcon}</span>
            <span>{formatGrowth(momGrowth)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
