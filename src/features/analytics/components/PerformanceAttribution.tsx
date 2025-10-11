// src/features/analytics/components/PerformanceAttribution.tsx

import React from 'react';
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
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
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

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
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

      {/* Explanation */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#656d76',
        lineHeight: '1.6'
      }}>
        <strong style={{ color: '#1a1a1a' }}>How to read this:</strong>
        <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li><strong>Volume Effect:</strong> Change due to selling more or fewer policies</li>
          <li><strong>Rate Effect:</strong> Change due to commission percentage adjustments</li>
          <li><strong>Mix Effect:</strong> Change due to shifts in product composition (higher/lower premium products)</li>
        </ul>
      </div>
    </div>
  );
}
