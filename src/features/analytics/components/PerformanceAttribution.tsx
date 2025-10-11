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
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Performance Attribution
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
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
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a1a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Performance Attribution
            </div>
            <div style={{
              fontSize: '11px',
              color: '#656d76',
              marginTop: '4px'
            }}>
              Month-over-month change breakdown
            </div>
          </div>
          {/* Info Icon Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: '#f0f9ff',
              border: '1px solid #e0f2fe',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              color: '#3b82f6',
              transition: 'all 0.2s ease',
            }}
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
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '12px',
          lineHeight: '1.8',
          color: '#1e40af'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>
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

          <div style={{ marginBottom: '16px' }}>
            <strong>What is this?</strong> Performance Attribution breaks down exactly WHY your commission income changed from last month to this month.
            Think of it as detective work - finding out what drove your success (or decline).
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>The Three Factors:</strong>
          </div>

          <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#3b82f6' }}>📈 Volume Effect (Blue):</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Did you sell MORE or FEWER policies?
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: Selling 10 policies instead of 5 = positive volume effect
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#10b981' }}>💰 Rate Effect (Green):</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Did your commission PERCENTAGE change?
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: Moving from 50% to 75% commission rate = positive rate effect
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#f59e0b' }}>🎯 Mix Effect (Yellow):</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Did you sell different TYPES of products?
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: Selling more whole life (higher premium) vs term = positive mix effect
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
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
        <div style={{
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #e0f2fe'
        }}>
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
