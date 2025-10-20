// src/features/analytics/components/GeographicAnalysis.tsx

import React from 'react';
import { USMap, StateData } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * GeographicAnalysis - State-level performance analysis
 */
export function GeographicAnalysis() {
  const { raw, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading geographic data...
        </div>
      </div>
    );
  }

  // Aggregate by state
  const stateMap = new Map<string, { count: number; revenue: number }>();

  raw.policies.forEach(policy => {
    const state = policy.client?.state || 'Unknown';
    const existing = stateMap.get(state) || { count: 0, revenue: 0 };
    stateMap.set(state, {
      count: existing.count + 1,
      revenue: existing.revenue + (policy.annualPremium || 0)
    });
  });

  const stateData: StateData[] = Array.from(stateMap.entries())
    .map(([state, data]) => ({
      state,
      value: data.revenue,
      label: `${data.count} policies`
    }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <USMap data={stateData} title="Premium by State" valueLabel="Annual Premium" />
    </div>
  );
}
