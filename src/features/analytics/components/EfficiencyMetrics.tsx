// src/features/analytics/components/EfficiencyMetrics.tsx

import React from 'react';
import { ScatterPlot, ScatterDataPoint } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * EfficiencyMetrics - Carrier efficiency and ROI analysis
 */
export function EfficiencyMetrics() {
  const { attribution, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading efficiency data...
        </div>
      </div>
    );
  }

  const { carrierROI } = attribution;

  // Prepare scatter plot data
  const scatterData: ScatterDataPoint[] = carrierROI.map(carrier => ({
    x: carrier.totalPolicies,
    y: carrier.roi,
    label: carrier.carrierName,
    size: Math.max(6, Math.min(12, carrier.totalPolicies / 5)),
    color: carrier.trend === 'improving' ? 'rgb(16, 185, 129)' :
           carrier.trend === 'declining' ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)'
  }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
        Carrier Efficiency
      </div>

      <ScatterPlot
        data={scatterData}
        xLabel="Total Policies"
        yLabel="ROI (%)"
        title="Carrier Performance"
      />
    </div>
  );
}
