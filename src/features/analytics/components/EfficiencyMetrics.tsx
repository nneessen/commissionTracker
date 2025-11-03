// src/features/analytics/components/EfficiencyMetrics.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScatterPlot, ScatterDataPoint } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';

/**
 * Efficiency Metrics - Carrier performance and commission analysis
 * Shows which carriers are most profitable for the agent
 */
export function EfficiencyMetrics() {
  const { dateRange } = useAnalyticsDateRange();
  const { attribution, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading efficiency data...
        </CardContent>
      </Card>
    );
  }

  const { carrierROI = [] } = attribution || {};

  // Check if we have data
  if (!carrierROI || carrierROI.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
            Carrier Efficiency
          </div>
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-2">No carrier data available</p>
            <p className="text-xs text-muted-foreground">
              Add policies with carriers to see efficiency metrics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display meaningful carrier performance metrics
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Carrier Performance
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Which carriers generate the most commission
          </p>
        </div>

        {/* Carrier Performance List */}
        <div className="space-y-2">
          {carrierROI.slice(0, 5).map((carrier, index) => {
            // Calculate more meaningful metrics
            const avgCommissionRate = carrier.avgCommissionRate || 0;
            const totalCommission = carrier.totalCommission || 0;
            const avgCommissionPerPolicy = carrier.efficiency || 0;

            return (
              <div key={carrier.carrierId} className="p-3 bg-muted/20 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {carrier.carrierName}
                    </span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {carrier.totalPolicies} {carrier.totalPolicies === 1 ? 'policy' : 'policies'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">
                      ${totalCommission.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      total commission
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Avg Rate</span>
                    <div className="text-xs font-medium text-foreground">
                      {avgCommissionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Avg Premium</span>
                    <div className="text-xs font-medium text-foreground">
                      ${carrier.avgPremium.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Per Policy</span>
                    <div className="text-xs font-medium text-foreground">
                      ${avgCommissionPerPolicy.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Performance Indicator */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{
                          width: `${Math.min((totalCommission / (carrierROI[0]?.totalCommission || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${
                    carrier.trend === 'improving' ? 'text-success' :
                    carrier.trend === 'declining' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {carrier.trend === 'improving' ? '↑' :
                     carrier.trend === 'declining' ? '↓' :
                     '→'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {carrierROI.length > 5 && (
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Showing top 5 of {carrierROI.length} carriers by total commission
          </div>
        )}

        {/* Summary Stats */}
        {carrierROI.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Best Rate</span>
                <div className="text-sm font-semibold text-foreground">
                  {Math.max(...carrierROI.map(c => c.avgCommissionRate || 0)).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Commission/Policy</span>
                <div className="text-sm font-semibold text-foreground">
                  ${(carrierROI.reduce((sum, c) => sum + (c.efficiency || 0), 0) / carrierROI.length).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
