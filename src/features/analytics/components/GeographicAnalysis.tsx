// src/features/analytics/components/GeographicAnalysis.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Search } from 'lucide-react';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';

interface StateData {
  state: string;
  policyCount: number;
  totalPremium: number;
  avgPremium: number;
  percentOfTotal: number;
}

type SortColumn = 'state' | 'policies' | 'premium' | 'avgPremium' | 'percent';

/**
 * GeographicAnalysis - Sortable table view of premium by state
 * Replaces map visualization with more practical data table
 */
export function GeographicAnalysis() {
  const { dateRange } = useAnalyticsDateRange();
  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('premium');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Premium by State
          </div>
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading state data...
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

  // Filter by search term
  const filteredData = stateData.filter(data =>
    data.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case 'state':
        comparison = a.state.localeCompare(b.state);
        break;
      case 'policies':
        comparison = a.policyCount - b.policyCount;
        break;
      case 'premium':
        comparison = a.totalPremium - b.totalPremium;
        break;
      case 'avgPremium':
        comparison = a.avgPremium - b.avgPremium;
        break;
      case 'percent':
        comparison = a.percentOfTotal - b.percentOfTotal;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Premium by State
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stateData.length} states with policies
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search states..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th
                    className="text-left p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center gap-1">
                      <span>State</span>
                      {sortColumn === 'state' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    onClick={() => handleSort('policies')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Policies</span>
                      {sortColumn === 'policies' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    onClick={() => handleSort('premium')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Premium</span>
                      {sortColumn === 'premium' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    onClick={() => handleSort('avgPremium')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Avg Premium</span>
                      {sortColumn === 'avgPremium' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                  <th
                    className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                    onClick={() => handleSort('percent')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>% of Total</span>
                      {sortColumn === 'percent' && <ArrowUpDown className="h-3 w-3" />}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedData.map((data, index) => (
                  <tr
                    key={data.state}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                  >
                    <td className="p-2 font-medium">{data.state}</td>
                    <td className="p-2 text-right">{data.policyCount}</td>
                    <td className="p-2 text-right font-mono font-semibold">
                      {formatCurrency(data.totalPremium)}
                    </td>
                    <td className="p-2 text-right font-mono text-muted-foreground">
                      {formatCurrency(data.avgPremium)}
                    </td>
                    <td className="p-2 text-right text-success font-semibold">
                      {formatPercent(data.percentOfTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedData.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            {searchTerm ? 'No states match your search' : 'No state data available'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
