// src/features/analytics/components/EfficiencyMetrics.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScatterPlot, ScatterDataPoint } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * Efficiency Metrics - Carrier efficiency and ROI analysis
 */
export function EfficiencyMetrics() {
  const { attribution, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading efficiency data...
        </CardContent>
      </Card>
    );
  }

  const { carrierROI } = attribution;

  // Prepare scatter plot data - using CSS variables via getComputedStyle
  const scatterData: ScatterDataPoint[] = carrierROI.map(carrier => ({
    x: carrier.totalPolicies,
    y: carrier.roi,
    label: carrier.carrierName,
    size: Math.max(6, Math.min(12, carrier.totalPolicies / 5)),
    color: carrier.trend === 'improving' ? 'hsl(var(--status-active))' :
           carrier.trend === 'declining' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
          Carrier Efficiency
        </div>

        <ScatterPlot
          data={scatterData}
          xLabel="Total Policies"
          yLabel="ROI (%)"
          title="Carrier Performance"
        />
      </CardContent>
    </Card>
  );
}
