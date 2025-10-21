// src/features/analytics/components/PerformanceAttribution.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    if (value > 0) return { colorClass: 'text-green-500', symbol: '▲', text: 'increase' };
    if (value < 0) return { colorClass: 'text-red-500', symbol: '▼', text: 'decrease' };
    return { colorClass: 'text-gray-600', symbol: '━', text: 'no change' };
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
        <div className={`flex items-center gap-2 text-base font-bold font-mono ${totalDirection.colorClass}`}>
          <span>{totalDirection.symbol}</span>
          <span>{formatCurrency(Math.abs(contribution.totalChange))}</span>
        </div>
      </div>

      {/* Info Panel - Shows when info button is clicked */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
              Understanding Performance Attribution
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
            <strong>What is this?</strong> Performance Attribution breaks down exactly WHY your commission income changed from last month to this month.
            Think of it as detective work - finding out what drove your success (or decline).
          </div>

          <div className="mb-4">
            <strong>The Three Factors:</strong>
          </div>

          <div className="mb-3 pl-4">
            <div className="mb-2">
              <strong className="text-blue-500">Volume Effect (Blue):</strong>
              <div className="mt-1 text-gray-600">
                Did you sell MORE or FEWER policies?
                <div className="text-xs mt-0.5">
                  Example: Selling 10 policies instead of 5 = positive volume effect
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">Rate Effect (Green):</strong>
              <div className="mt-1 text-gray-600">
                Did your commission PERCENTAGE change?
                <div className="text-xs mt-0.5">
                  Example: Moving from 50% to 75% commission rate = positive rate effect
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-amber-500">Mix Effect (Yellow):</strong>
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
              <div className="mt-2 text-blue-700">
                Total Change: +$7,100<br/>
                • Volume: +3 policies worth ~$1,500<br/>
                • Rate: +10% commission worth ~$1,600<br/>
                • Mix: Whole life vs term worth ~$4,000
              </div>
            </div>
          </div>

          <div className="p-2 bg-blue-100 rounded text-xs text-center text-blue-700">
            <strong>Pro Tip:</strong> Focus on the largest contributor to optimize your growth strategy!
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-6">
        {/* Volume Effect */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Volume Effect
          </div>
          <div className="text-sm font-bold text-info font-mono mb-1">
            {formatCurrency(contribution.volumeEffect)}
          </div>
          <div className="text-xs text-muted-foreground">
            {contribution.volumePercent.toFixed(0)}% of total change
          </div>
        </div>

        {/* Rate Effect */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Rate Effect
          </div>
          <div className="text-sm font-bold text-success font-mono mb-1">
            {formatCurrency(contribution.rateEffect)}
          </div>
          <div className="text-xs text-muted-foreground">
            {contribution.ratePercent.toFixed(0)}% of total change
          </div>
        </div>

        {/* Mix Effect */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Mix Effect
          </div>
          <div className="text-sm font-bold text-warning font-mono mb-1">
            {formatCurrency(contribution.mixEffect)}
          </div>
          <div className="text-xs text-muted-foreground">
            {contribution.mixPercent.toFixed(0)}% of total change
          </div>
        </div>
      </div>

      {/* Waterfall Chart */}
      <WaterfallChart data={contribution} />
    </div>
  );
}
