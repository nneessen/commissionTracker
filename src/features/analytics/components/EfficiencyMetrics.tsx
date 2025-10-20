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
    color: carrier.trend === 'improving' ? '#10b981' :
           carrier.trend === 'declining' ? '#ef4444' : '#3b82f6'
  }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
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
