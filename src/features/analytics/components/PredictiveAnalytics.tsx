// src/features/analytics/components/PredictiveAnalytics.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
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
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading forecast data...
        </CardContent>
      </Card>
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
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Predictive Analytics
          </div>
          {/* Info Icon Button */}
          <Button
            onClick={() => setShowInfo(!showInfo)}
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:scale-110 transition-transform"
            title="Click for detailed explanation"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <Alert className="bg-gradient-to-r from-primary/20 via-info/10 to-card shadow-md mb-4">
            <AlertDescription>
              <div className="flex justify-between items-start mb-3">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Understanding Predictive Analytics
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
                <strong>What is this?</strong> Predictive Analytics uses your historical data to forecast future performance and identify upcoming opportunities.
                Think of it as your business crystal ball - helping you plan ahead and spot potential issues before they happen.
              </div>

              <div className="mb-4">
                <strong className="text-foreground">Key Forecasts:</strong>
              </div>

              <div className="mb-3 pl-4">
                <div className="mb-2">
                  <strong className="text-primary">Next 3 Months Renewals:</strong>
                  <div className="mt-1 text-muted-foreground">
                    How many policies are coming up for renewal soon
                    <div className="text-xs mt-0.5">
                      Example: <span className="text-primary font-bold">25 policies</span> = 25 opportunities to re-engage clients
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-success">Expected Revenue:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Projected commission income from upcoming renewals
                    <div className="text-xs mt-0.5">
                      Based on current <span className="text-success font-bold">commission rates</span> and premium amounts
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-info">Growth Trajectory:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Projected business growth based on recent trends
                    <div className="text-xs mt-0.5">
                      Shows if you're <span className="text-success font-bold">trending up</span>, <span className="text-destructive font-bold">down</span>, or staying stable
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-info/15 via-status-earned/10 to-card rounded-md shadow-sm">
                <strong className="text-foreground">How Predictions Work:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  The system analyzes:
                  <div className="pl-3 mt-1">
                    • Your last <span className="text-info font-bold">6-12 months</span> of policy data<br/>
                    • Seasonal patterns (busy months vs slow months)<br/>
                    • Renewal cycles and policy anniversaries<br/>
                    • Historical retention rates<br/>
                    • Recent sales trends
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-success/15 via-status-active/10 to-card rounded-md shadow-sm">
                <strong className="text-foreground">Real Example:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  Current date: October 2025<br/>
                  Next 3 months (Nov, Dec, Jan):<br/>
                  • <span className="text-primary font-bold">15 policies</span> renewing in November<br/>
                  • <span className="text-primary font-bold">12 policies</span> renewing in December<br/>
                  • <span className="text-primary font-bold">8 policies</span> renewing in January<br/>
                  <div className="mt-2 text-foreground">
                    <strong className="text-success">Total:</strong> <span className="text-success font-bold">35 renewal opportunities</span> worth ~<span className="text-success font-bold">$18,000</span> in commissions<br/>
                    <strong className="text-primary">Action:</strong> Start reaching out 30 days before each renewal date!
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/10 rounded text-xs text-center text-primary font-semibold shadow-sm">
                <strong>Pro Tip:</strong> Contact clients 30-45 days before renewal to maximize retention and explore upsell opportunities!
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-6">
          <Card className="bg-gradient-to-br from-primary/20 via-accent/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Next 3 Months Renewals
              </div>
              <div className="text-lg font-bold text-primary font-mono">
                {next3MonthsRenewals}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/20 via-status-active/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Expected Revenue
              </div>
              <div className="text-lg font-bold text-success font-mono">
                {formatCurrency(next3MonthsRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/20 via-status-earned/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Growth Rate
              </div>
              <div className="text-lg font-bold text-info font-mono">
                {growth[0]?.growthRate.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forecast Chart */}
        <ForecastChart
          data={growth}
          title="12-Month Growth Projection"
          valueKey="projectedCommission"
          valueLabel="Projected Commission"
        />
      </CardContent>
    </Card>
  );
}
