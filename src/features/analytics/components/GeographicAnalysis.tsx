// src/features/analytics/components/GeographicAnalysis.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { USMap, StateData } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * GeographicAnalysis - State-level performance analysis
 */
export function GeographicAnalysis() {
  const { raw, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading geographic data...
        </CardContent>
      </Card>
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
    <Card>
      <CardContent className="p-5">
        <USMap data={stateData} title="Premium by State" valueLabel="Annual Premium" />
      </CardContent>
    </Card>
  );
}
