// src/features/analytics/components/PerformanceAttribution.tsx

import React, { useState } from 'react';
import { WaterfallChart } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * PerformanceAttribution - Contribution breakdown analysis
 *
 * Shows what's driving performance changes:
 * - Volume effects (more/fewer policies)
 * - Rate effects (commission percentage changes)
 * - Mix effects (product composition shifts)
 */
export function PerformanceAttribution() {
  // Don't pass date range - parent handles filtering via React Context or we accept all data
  const { attribution, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
          Performance Attribution
        </div>
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading attribution data...
        </div>
      </div>
    );
  }

  const { contribution } = attribution;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getChangeDirection = (value: number) => {
    if (value > 0) return { color: '#10b981', symbol: '▲', text: 'increase' };
    if (value < 0) return { color: '#ef4444', symbol: '▼', text: 'decrease' };
    return { color: '#656d76', symbol: '━', text: 'no change' };
  };

  const totalDirection = getChangeDirection(contribution.totalChange);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm w-full box-border overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Performance Attribution
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Month-over-month change breakdown
            </div>
          </div>
          {/* Info Icon Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="bg-blue-50 border border-blue-100"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dbeafe';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0f9ff';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Click for detailed explanation"
          >
            i
          </button>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '16px',
          fontWeight: 700,
          color: totalDirection.color,
          fontFamily: 'Monaco, monospace'
        }}>
          <span>{totalDirection.symbol}</span>
          <span>{formatCurrency(Math.abs(contribution.totalChange))}</span>
        </div>
      </div>

      {/* Info Panel - Shows when info button is clicked */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
              📊 Understanding Performance Attribution
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <strong>What is this?</strong> Performance Attribution breaks down exactly WHY your commission income changed from last month to this month.
            Think of it as detective work - finding out what drove your success (or decline).
          </div>

          <div className="mb-4">
            <strong>The Three Factors:</strong>
          </div>

          <div className="mb-3 pl-4">
            <div className="mb-2">
              <strong className="text-blue-500">📈 Volume Effect (Blue):</strong>
              <div className="mt-1 text-gray-600">
                Did you sell MORE or FEWER policies?
                <div className="text-xs mt-0.5">
                  Example: Selling 10 policies instead of 5 = positive volume effect
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">💰 Rate Effect (Green):</strong>
              <div className="mt-1 text-gray-600">
                Did your commission PERCENTAGE change?
                <div className="text-xs mt-0.5">
                  Example: Moving from 50% to 75% commission rate = positive rate effect
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-amber-500">🎯 Mix Effect (Yellow):</strong>
              <div className="mt-1 text-gray-600">
                Did you sell different TYPES of products?
                <div className="text-xs mt-0.5">
                  Example: Selling more whole life (higher premium) vs term = positive mix effect
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
              Last month: 5 term policies × $1,000 premium × 50% rate = $2,500 commission<br/>
              This month: 8 whole life × $2,000 premium × 60% rate = $9,600 commission<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                Total Change: +$7,100<br/>
                • Volume: +3 policies worth ~$1,500<br/>
                • Rate: +10% commission worth ~$1,600<br/>
                • Mix: Whole life vs term worth ~$4,000
              </div>
            </div>
          </div>

          <div style={{
            padding: '8px',
            background: '#dbeafe',
            borderRadius: '4px',
            fontSize: '11px',
            textAlign: 'center',
            color: '#1e40af'
          }}>
            💡 <strong>Pro Tip:</strong> Focus on the largest contributor to optimize your growth strategy!
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Volume Effect */}
        <div className="bg-blue-50 border border-blue-100">
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Volume Effect
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#3b82f6',
            fontFamily: 'Monaco, monospace',
            marginBottom: '4px'
          }}>
            {formatCurrency(contribution.volumeEffect)}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#656d76'
          }}>
            {contribution.volumePercent.toFixed(0)}% of total change
          </div>
        </div>

        {/* Rate Effect */}
        <div style={{
          padding: '12px',
          background: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #dcfce7'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Rate Effect
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#10b981',
            fontFamily: 'Monaco, monospace',
            marginBottom: '4px'
          }}>
            {formatCurrency(contribution.rateEffect)}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#656d76'
          }}>
            {contribution.ratePercent.toFixed(0)}% of total change
          </div>
        </div>

        {/* Mix Effect */}
        <div style={{
          padding: '12px',
          background: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fef3c7'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Mix Effect
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#f59e0b',
            fontFamily: 'Monaco, monospace',
            marginBottom: '4px'
          }}>
            {formatCurrency(contribution.mixEffect)}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#656d76'
          }}>
            {contribution.mixPercent.toFixed(0)}% of total change
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <WaterfallChart data={contribution} />
    </div>
  );
}
