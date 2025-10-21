// src/features/analytics/components/PredictiveAnalytics.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
      <div className="flex items-center gap-2 mb-5">
        <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Predictive Analytics
        </div>
        {/* Info Icon Button */}
        <Button
          onClick={() => setShowInfo(!showInfo)}
          size="icon"
          variant="ghost"
          className="h-6 w-6 bg-blue-50 border border-blue-100 hover:bg-blue-200 hover:scale-110 transition-transform"
          title="Click for detailed explanation"
        >
          i
        </Button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
              Understanding Predictive Analytics
            </h3>
            <Button
              onClick={() => setShowInfo(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-lg text-slate-600 hover:text-slate-900"
            >
              ×
            </Button>
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
              <strong className="text-blue-500">Next 3 Months Renewals:</strong>
              <div className="mt-1 text-gray-600">
                How many policies are coming up for renewal soon
                <div className="text-xs mt-0.5">
                  Example: 25 policies = 25 opportunities to re-engage clients
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">Expected Revenue:</strong>
              <div className="mt-1 text-gray-600">
                Projected commission income from upcoming renewals
                <div className="text-xs mt-0.5">
                  Based on current commission rates and premium amounts
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-amber-500">Growth Trajectory:</strong>
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
              <div className="mt-2 text-blue-700">
                <strong>Total:</strong> 35 renewal opportunities worth ~$18,000 in commissions<br/>
                <strong>Action:</strong> Start reaching out 30 days before each renewal date!
              </div>
            </div>
          </div>

          <div className="p-2 bg-blue-100 rounded text-xs text-center text-blue-700">
            <strong>Pro Tip:</strong> Contact clients 30-45 days before renewal to maximize retention and explore upsell opportunities!
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Next 3 Months Renewals
          </div>
          <div className="text-lg font-bold text-info font-mono">
            {next3MonthsRenewals}
          </div>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Expected Revenue
          </div>
          <div className="text-lg font-bold text-success font-mono">
            {formatCurrency(next3MonthsRevenue)}
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Growth Rate
          </div>
          <div className="text-lg font-bold text-warning font-mono">
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
