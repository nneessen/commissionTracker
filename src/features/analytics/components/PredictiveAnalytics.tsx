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
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
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
    <div className="bg-white rounded-xl p-5 shadow-sm w-full box-border overflow-hidden">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Predictive Analytics
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

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
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

          <div className="mb-4">
            <strong>What is this?</strong> Predictive Analytics uses your historical data to forecast future performance and identify upcoming opportunities.
            Think of it as your business crystal ball - helping you plan ahead and spot potential issues before they happen.
          </div>

          <div className="mb-4">
            <strong>Key Forecasts:</strong>
          </div>

          <div className="mb-3 pl-4">
            <div className="mb-2">
              <strong className="text-blue-500">📊 Next 3 Months Renewals:</strong>
              <div className="mt-1 text-gray-600">
                How many policies are coming up for renewal soon
                <div className="text-xs mt-0.5">
                  Example: 25 policies = 25 opportunities to re-engage clients
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">💰 Expected Revenue:</strong>
              <div className="mt-1 text-gray-600">
                Projected commission income from upcoming renewals
                <div className="text-xs mt-0.5">
                  Based on current commission rates and premium amounts
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-amber-500">📈 Growth Trajectory:</strong>
              <div className="mt-1 text-gray-600">
                Projected business growth based on recent trends
                <div className="text-xs mt-0.5">
                  Shows if you're trending up, down, or staying stable
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>How Predictions Work:</strong>
            <div className="text-xs mt-2 text-gray-600">
              The system analyzes:
              <div className="pl-3 mt-1">
                • Your last 6-12 months of policy data<br/>
                • Seasonal patterns (busy months vs slow months)<br/>
                • Renewal cycles and policy anniversaries<br/>
                • Historical retention rates<br/>
                • Recent sales trends
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
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
