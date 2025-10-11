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
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
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
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <USMap data={stateData} title="Premium by State" valueLabel="Annual Premium" />
    </div>
  );
}
