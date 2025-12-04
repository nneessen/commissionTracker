// src/features/analytics/components/PerformanceAttribution.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Info, X } from 'lucide-react';
import { WaterfallChart } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';

/**
 * PerformanceAttribution - Contribution breakdown analysis
 *
 * Shows what's driving performance changes:
 * - Volume effects (more/fewer policies)
 * - Rate effects (commission percentage changes)
 * - Mix effects (product composition shifts)
 */
export function PerformanceAttribution() {
  // Use the shared date range from context
  const { dateRange } = useAnalyticsDateRange();
  const { attribution, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <Heading
            title="What Changed My Income?"
            subtitle="Understanding your commission changes"
          />
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading attribution data...
          </div>
        </CardContent>
      </Card>
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
    if (value > 0) return { colorClass: 'text-status-active', symbol: '▲', text: 'increase' };
    if (value < 0) return { colorClass: 'text-destructive', symbol: '▼', text: 'decrease' };
    return { colorClass: 'text-muted-foreground', symbol: '━', text: 'no change' };
  };

  const totalDirection = getChangeDirection(contribution.totalChange);

  return (
    <Card className="w-full">
      <CardContent className="p-3">
        {/* Header */}
        <Heading
          title="What Changed My Income?"
          subtitle="Understanding your commission changes"
        >
          <div className="flex items-center gap-1">
            {/* Info Icon Button */}
            <Button
              onClick={() => setShowInfo(!showInfo)}
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              title="Click for detailed explanation"
            >
              <Info className="h-3 w-3" />
            </Button>
            <div className={cn("flex items-center gap-1 text-[11px] font-bold font-mono", totalDirection.colorClass)}>
              <span>{totalDirection.symbol}</span>
              <span>{formatCurrency(Math.abs(contribution.totalChange))}</span>
            </div>
          </div>
        </Heading>

        {/* Info Panel - Shows when info button is clicked */}
        {showInfo && (
          <Alert className="bg-gradient-to-r from-primary/20 via-info/10 to-card shadow-md mb-4">
            <AlertDescription>
              <div className="flex justify-between items-start mb-3">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Understanding Performance Attribution
                </h3>
                <Button
                  onClick={() => setShowInfo(false)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 text-foreground">
                <strong>What is this?</strong> Performance Attribution breaks down exactly WHY your commission income changed from last month to this month.
                Think of it as detective work - finding out what drove your success (or decline).
              </div>

              <div className="mb-4">
                <strong className="text-foreground">The Three Factors:</strong>
              </div>

              <div className="mb-3 pl-4">
                <div className="mb-2">
                  <strong className="text-primary">Policy Count Impact (Purple):</strong>
                  <div className="mt-1 text-muted-foreground">
                    How did the number of policies you sold affect your income?
                    <div className="text-xs mt-0.5">
                      Example: Selling <span className="text-success font-bold">10 policies</span> instead of 5 = positive volume effect
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-success">Commission % Change (Green):</strong>
                  <div className="mt-1 text-muted-foreground">
                    How did changes in commission rates affect your income?
                    <div className="text-xs mt-0.5">
                      Example: Moving from 50% to <span className="text-success font-bold">75% commission rate</span> = positive rate effect
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-info">Product Type Impact (Blue):</strong>
                  <div className="mt-1 text-muted-foreground">
                    How did selling different product types affect your income?
                    <div className="text-xs mt-0.5">
                      Example: Selling more <span className="text-info font-bold">whole life</span> (higher premium) vs term = positive mix effect
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-success/15 via-status-active/10 to-card rounded-md shadow-sm">
                <strong className="text-foreground">Real Example:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  Last month: <span className="text-muted-foreground">5 term policies × $1,000 premium × 50% rate = $2,500 commission</span><br/>
                  This month: <span className="text-success font-bold">8 whole life × $2,000 premium × 60% rate = $9,600 commission</span><br/>
                  <div className="mt-2 text-foreground">
                    <span className="text-success font-bold">Total Change: +$7,100</span><br/>
                    • <span className="text-primary font-bold">Volume:</span> +3 policies worth ~<span className="text-primary">$1,500</span><br/>
                    • <span className="text-success font-bold">Rate:</span> +10% commission worth ~<span className="text-success">$1,600</span><br/>
                    • <span className="text-info font-bold">Mix:</span> Whole life vs term worth ~<span className="text-info">$4,000</span>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/10 rounded text-xs text-center text-primary font-semibold shadow-sm">
                <strong>Pro Tip:</strong> Focus on the largest contributor to optimize your growth strategy!
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 mb-3">
          {/* Volume Effect */}
          <Card className="bg-muted/30 border-primary/20 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Policy Count Impact
              </div>
              <div className="text-sm font-bold text-foreground font-mono mb-1">
                {formatCurrency(contribution.volumeEffect)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-primary font-bold">{contribution.volumePercent.toFixed(0)}%</span> of total change
              </div>
            </CardContent>
          </Card>

          {/* Rate Effect */}
          <Card className="bg-muted/30 border-success/20 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Commission % Change
              </div>
              <div className="text-sm font-bold text-foreground font-mono mb-1">
                {formatCurrency(contribution.rateEffect)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-success font-bold">{contribution.ratePercent.toFixed(0)}%</span> of total change
              </div>
            </CardContent>
          </Card>

          {/* Mix Effect */}
          <Card className="bg-muted/30 border-info/20 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Product Type Impact
              </div>
              <div className="text-sm font-bold text-foreground font-mono mb-1">
                {formatCurrency(contribution.mixEffect)}
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="text-info font-bold">{contribution.mixPercent.toFixed(0)}%</span> of total change
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waterfall Chart */}
        <WaterfallChart data={contribution} />
      </CardContent>
    </Card>
  );
}
