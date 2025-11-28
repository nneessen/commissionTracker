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
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Policy Status Overview
          </div>
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading policy data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusSummary = getPolicyStatusSummary(raw.policies);
  const monthlyTrend = getMonthlyTrendData(raw.policies);
  const { bestPerformers, needsAttention } = getProductRetentionRates(raw.policies);

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Policy Status Overview
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Current policy health and retention trends
          </div>
        </div>

        {/* 3-Card Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Active Policies */}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                Active
              </span>
            </div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {statusSummary.active.count}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              {statusSummary.active.percentage}% of total
            </div>
          </div>

          {/* Lapsed Policies */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Lapsed
              </span>
            </div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {statusSummary.lapsed.count}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {statusSummary.lapsed.percentage}% of total
            </div>
          </div>

          {/* Cancelled Policies */}
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wide">
                Cancelled
              </span>
            </div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">
              {statusSummary.cancelled.count}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
              {statusSummary.cancelled.percentage}% of total
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
            12-Month Trend
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="active"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  name="Active Policies"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="lapsed"
                  stroke="hsl(38, 92%, 50%)"
                  strokeWidth={2}
                  name="Lapsed Policies"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Tables */}
        {(bestPerformers.length > 0 || needsAttention.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {/* Best Performers */}
            {bestPerformers.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Best Performers
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Product</th>
                        <th className="text-right p-2 font-medium">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestPerformers.map((product, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2 truncate" title={product.productName}>
                            {product.productName}
                            <span className="text-muted-foreground ml-1">
                              ({product.activePolicies}/{product.totalPolicies})
                            </span>
                          </td>
                          <td className="p-2 text-right font-semibold text-green-600 dark:text-green-400">
                            {product.retentionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Needs Attention */}
            {needsAttention.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Needs Attention
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Product</th>
                        <th className="text-right p-2 font-medium">Retention</th>
                      </tr>
                    </thead>
                    <tbody>
                      {needsAttention.map((product, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2 truncate" title={product.productName}>
                            {product.productName}
                            <span className="text-muted-foreground ml-1">
                              ({product.activePolicies}/{product.totalPolicies})
                            </span>
                          </td>
                          <td className="p-2 text-right font-semibold text-amber-600 dark:text-amber-400">
                            {product.retentionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {bestPerformers.length === 0 && needsAttention.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-4">
            Not enough policy data to show product retention rates (need 3+ policies per product)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
