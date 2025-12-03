// src/features/analytics/components/PolicyStatusBreakdown.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAnalyticsData } from '@/hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import {
  getPolicyStatusSummary,
  getMonthlyTrendData,
  getProductRetentionRates,
} from '@/services/analytics/policyStatusService';
import { Heading } from '@/components/ui/heading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * PolicyStatusBreakdown - Clear view of policy statuses without jargon
 *
 * Replaces the confusing "cohort" terminology with simple, actionable insights:
 * - Active, Lapsed, Cancelled counts
 * - Monthly trends showing how policies change over time
 * - Best/worst performing products by retention
 */
export function PolicyStatusBreakdown() {
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
            Policy Status
          </div>
          <div className="p-3 text-center text-[11px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusSummary = getPolicyStatusSummary(raw.policies);
  const monthlyTrend = getMonthlyTrendData(raw.policies);
  const { bestPerformers, needsAttention } = getProductRetentionRates(raw.policies);

  // Format product names from snake_case to Title Case
  const formatProductName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card>
      <CardContent className="p-3">
        <Heading
          title="Policy Status"
          subtitle="Active vs Lapsed vs Cancelled"
        >
          {/* Inline Status Summary */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="text-green-600 dark:text-green-400 font-mono font-bold">
                {statusSummary.active.count}
              </span>
              <span className="text-muted-foreground/70">active</span>
              <span className="text-muted-foreground/50">({statusSummary.active.percentage}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                {statusSummary.lapsed.count}
              </span>
              <span className="text-muted-foreground/70">lapsed</span>
              <span className="text-muted-foreground/50">({statusSummary.lapsed.percentage}%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-red-600 dark:text-red-400 font-mono font-bold">
                {statusSummary.cancelled.count}
              </span>
              <span className="text-muted-foreground/70">cancelled</span>
              <span className="text-muted-foreground/50">({statusSummary.cancelled.percentage}%)</span>
            </div>
          </div>
        </Heading>

        {/* Compact Monthly Trend Chart */}
        <div className="mb-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase mb-1">
            12-Month Trend
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fontSize: 9 }}
                  height={20}
                />
                <YAxis className="text-xs" tick={{ fontSize: 9 }} width={30} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    fontSize: '10px',
                    padding: '4px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={1}
                  name="Active"
                  dot={{ r: 1.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="lapsed"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={1}
                  name="Lapsed"
                  dot={{ r: 1.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compact Performance Tables */}
        {(bestPerformers.length > 0 || needsAttention.length > 0) && (
          <div className="grid grid-cols-2 gap-1.5">
            {/* Best Performers */}
            {bestPerformers.length > 0 && (
              <div>
                <Heading title="Best Performers" className="mb-1" />
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="p-1.5 bg-primary/5">Product</TableHead>
                      <TableHead className="p-1.5 bg-primary/5 text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestPerformers.slice(0, 3).map((product, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                        <TableCell className="p-1.5">
                          {formatProductName(product.productName)}
                          <span className="text-[11px] text-muted-foreground/70 ml-1">
                            ({product.activePolicies})
                          </span>
                        </TableCell>
                        <TableCell className="p-1.5 text-right font-semibold font-mono text-green-600 dark:text-green-400">
                          {product.retentionRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Needs Attention */}
            {needsAttention.length > 0 && (
              <div>
                <Heading title="Needs Attention" className="mb-1" />
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="p-1.5 bg-primary/5">Product</TableHead>
                      <TableHead className="p-1.5 bg-primary/5 text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsAttention.slice(0, 3).map((product, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                        <TableCell className="p-1.5">
                          {formatProductName(product.productName)}
                          <span className="text-[11px] text-muted-foreground/70 ml-1">
                            ({product.activePolicies})
                          </span>
                        </TableCell>
                        <TableCell className="p-1.5 text-right font-semibold font-mono text-amber-600 dark:text-amber-400">
                          {product.retentionRate}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {bestPerformers.length === 0 && needsAttention.length === 0 && (
          <div className="text-center text-[11px] text-muted-foreground/70 py-2">
            Insufficient data for retention analysis
          </div>
        )}
      </CardContent>
    </Card>
  );
}
