// src/features/analytics/components/GeographicAnalysis.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { AnalyticsTable, AnalyticsHeading } from './shared';

interface StateData {
  state: string;
  policyCount: number;
  totalPremium: number;
  avgPremium: number;
  percentOfTotal: number;
}

/**
 * GeographicAnalysis - Premium by state
 * Ultra-compact display with shared components
 */
export function GeographicAnalysis() {
  const { dateRange } = useAnalyticsDateRange();
  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Premium by State
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate by state
  const stateMap = new Map<string, { count: number; totalPremium: number }>();

  raw.policies.forEach(policy => {
    const state = policy.client?.state || 'Unknown';
    const existing = stateMap.get(state) || { count: 0, totalPremium: 0 };
    stateMap.set(state, {
      count: existing.count + 1,
      totalPremium: existing.totalPremium + (policy.annualPremium || 0)
    });
  });

  // Calculate total premium for percentage calculations
  const totalPremium = Array.from(stateMap.values())
    .reduce((sum, data) => sum + data.totalPremium, 0);

  // Convert to array and calculate metrics
  const stateData: StateData[] = Array.from(stateMap.entries())
    .map(([state, data]) => ({
      state,
      policyCount: data.count,
      totalPremium: data.totalPremium,
      avgPremium: data.count > 0 ? data.totalPremium / data.count : 0,
      percentOfTotal: totalPremium > 0 ? (data.totalPremium / totalPremium) * 100 : 0,
    }));

  // Sort by total premium (descending) and take top 10 states
  const sortedData = stateData
    .sort((a, b) => b.totalPremium - a.totalPremium)
    .slice(0, 10);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-2">
        <AnalyticsHeading
          title="Premium by State"
          subtitle={`Top ${sortedData.length} states`}
        />

        <AnalyticsTable
          columns={[
            {
              key: 'state',
              header: 'State',
              className: 'font-medium'
            },
            {
              key: 'policyCount',
              header: 'Policies',
              align: 'right' as const,
              className: 'font-mono'
            },
            {
              key: 'totalPremium',
              header: 'Total',
              align: 'right' as const,
              render: (value: number) => formatCurrency(value),
              className: 'font-mono font-semibold'
            },
            {
              key: 'avgPremium',
              header: 'Avg',
              align: 'right' as const,
              render: (value: number) => formatCurrency(value),
              className: 'font-mono text-muted-foreground'
            },
            {
              key: 'percentOfTotal',
              header: '% Total',
              align: 'right' as const,
              render: (value: number) => (
                <span className={cn(
                  "font-mono",
                  value >= 20 ? "text-green-600 dark:text-green-400" :
                  value >= 10 ? "text-amber-600 dark:text-amber-400" :
                  "text-muted-foreground"
                )}>
                  {value.toFixed(1)}%
                </span>
              )
            }
          ]}
          data={sortedData}
          emptyMessage="No state data available"
        />
      </CardContent>
    </Card>
  );
}
