// src/features/analytics/components/GeographicAnalysis.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      <Card>
        <CardContent className="p-3">
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
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">Premium by State</div>
          <span className="text-[10px] text-muted-foreground">Top {sortedData.length} states</span>
        </div>

        {sortedData.length > 0 ? (
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-7">
                <TableHead className="p-1.5 bg-primary/5">State</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Policies</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Total</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Avg</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">% Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                  <TableCell className="p-1.5 font-medium">{row.state}</TableCell>
                  <TableCell className="p-1.5 text-right font-mono">{row.policyCount}</TableCell>
                  <TableCell className="p-1.5 text-right font-mono font-semibold">
                    {formatCurrency(row.totalPremium)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-muted-foreground">
                    {formatCurrency(row.avgPremium)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right">
                    <span className={cn(
                      "font-mono",
                      row.percentOfTotal >= 20 ? "text-green-600 dark:text-green-400" :
                      row.percentOfTotal >= 10 ? "text-amber-600 dark:text-amber-400" :
                      "text-muted-foreground"
                    )}>
                      {row.percentOfTotal.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-3 text-center text-[11px] text-muted-foreground/70">
            No state data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
