// src/features/analytics/components/PredictiveAnalytics.tsx

import React, { useState } from 'react';
import { ForecastChart } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * PredictiveAnalytics - Growth forecasts and predictions
 *
 * Shows growth projections with confidence intervals
 */
export function PredictiveAnalytics() {
  const { forecast, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

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
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Predictive Analytics
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

      {/* Info Panel */}
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
              🔮 Understanding Predictive Analytics
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
            <strong>What is this?</strong> Predictive Analytics uses your historical data to forecast future performance and identify upcoming opportunities.
            Think of it as your business crystal ball - helping you plan ahead and spot potential issues before they happen.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Key Forecasts:</strong>
          </div>

          <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#3b82f6' }}>📊 Next 3 Months Renewals:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                How many policies are coming up for renewal soon
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Example: 25 policies = 25 opportunities to re-engage clients
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#10b981' }}>💰 Expected Revenue:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Projected commission income from upcoming renewals
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Based on current commission rates and premium amounts
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#f59e0b' }}>📈 Growth Trajectory:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Projected business growth based on recent trends
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Shows if you're trending up, down, or staying stable
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>How Predictions Work:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              The system analyzes:
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                • Your last 6-12 months of policy data<br/>
                • Seasonal patterns (busy months vs slow months)<br/>
                • Renewal cycles and policy anniversaries<br/>
                • Historical retention rates<br/>
                • Recent sales trends
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              Current date: October 2025<br/>
              Next 3 months (Nov, Dec, Jan):<br/>
              • 15 policies renewing in November<br/>
              • 12 policies renewing in December<br/>
              • 8 policies renewing in January<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                <strong>Total:</strong> 35 renewal opportunities worth ~$18,000 in commissions<br/>
                <strong>Action:</strong> Start reaching out 30 days before each renewal date!
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
            💡 <strong>Pro Tip:</strong> Contact clients 30-45 days before renewal to maximize retention and explore upsell opportunities!
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
