// src/features/analytics/components/CommissionDeepDive.tsx

import React from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * CommissionDeepDive - Detailed commission analysis
 */
export function CommissionDeepDive() {
  const { cohort, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading commission data...
        </div>
      </div>
    );
  }

  const { earningProgress } = cohort;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalAdvance = earningProgress.reduce((sum, p) => sum + p.totalAdvance, 0);
  const totalEarned = earningProgress.reduce((sum, p) => sum + p.totalEarned, 0);
  const totalUnearned = earningProgress.reduce((sum, p) => sum + p.totalUnearned, 0);

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
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Commission Deep Dive
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        <div style={{
          padding: '12px',
          background: '#f0f9ff',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Total Advance
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#3b82f6',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalAdvance)}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#f0fdf4',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Total Earned
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#10b981',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalEarned)}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#fef2f2',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#656d76',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Total Unearned
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#ef4444',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(totalUnearned)}
          </div>
        </div>
      </div>
    </div>
  );
}
