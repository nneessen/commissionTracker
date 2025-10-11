// src/features/analytics/components/PredictiveAnalytics.tsx

import React from 'react';
import { ForecastChart } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * PredictiveAnalytics - Growth forecasts and predictions
 *
 * Shows growth projections with confidence intervals
 */
export function PredictiveAnalytics() {
  const { forecast, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading forecast data...
        </div>
      </div>
    );
  }

  const { growth, renewals } = forecast;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const next3MonthsRenewals = renewals.slice(0, 3).reduce((sum, r) => sum + r.expectedRenewals, 0);
  const next3MonthsRevenue = renewals.slice(0, 3).reduce((sum, r) => sum + r.expectedRevenue, 0);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Predictive Analytics
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
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
            Next 3 Months Renewals
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#3b82f6',
            fontFamily: 'Monaco, monospace'
          }}>
            {next3MonthsRenewals}
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
            Expected Revenue
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#10b981',
            fontFamily: 'Monaco, monospace'
          }}>
            {formatCurrency(next3MonthsRevenue)}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#fffbeb',
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
            Growth Rate
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#f59e0b',
            fontFamily: 'Monaco, monospace'
          }}>
            {growth[0]?.growthRate.toFixed(1) || 0}%
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <ForecastChart
        data={growth}
        title="12-Month Growth Projection"
        valueKey="projectedCommission"
        valueLabel="Projected Commission"
      />
    </div>
  );
}
