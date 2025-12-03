// src/features/analytics/components/ClientSegmentation.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { AnalyticsTable, AnalyticsHeading } from './shared';

/**
 * ClientSegmentation - Client value segmentation and opportunities
 *
 * Segments clients by value (High/Medium/Low) and identifies cross-sell opportunities
 */
export function ClientSegmentation() {
  const { dateRange } = useAnalyticsDateRange();
  const { segmentation, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Client Segments
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!segmentation) {
    return null;
  }

  const { segments: segmentData, crossSell } = segmentation;
  const totalRevenue = segmentData.totalPremiumByTier.high + segmentData.totalPremiumByTier.medium + segmentData.totalPremiumByTier.low;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const segmentColumns = [
    {
      key: 'tier',
      header: 'Tier',
      render: (value: string) => (
        <span className={cn(
          "font-medium",
          value === 'HIGH' ? "text-green-600 dark:text-green-400" :
          value === 'MED' ? "text-amber-600 dark:text-amber-400" :
          "text-red-600 dark:text-red-400"
        )}>
          {value}
        </span>
      )
    },
    {
      key: 'clients',
      header: 'Clients',
      align: 'right' as const,
      className: 'font-mono'
    },
    {
      key: 'totalAP',
      header: 'Total AP',
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
      className: 'font-mono font-semibold'
    },
    {
      key: 'avgAP',
      header: 'Avg AP',
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
      className: 'font-mono text-muted-foreground'
    },
    {
      key: 'mixPercent',
      header: 'Mix %',
      align: 'right' as const,
      render: (value: number, row: any) => (
        <span className={cn(
          "font-mono",
          row.tier === 'HIGH' ? "text-green-600 dark:text-green-400" :
          row.tier === 'MED' ? "text-amber-600 dark:text-amber-400" :
          "text-red-600 dark:text-red-400"
        )}>
          {value.toFixed(1)}%
        </span>
      )
    }
  ];

  const segmentTableData = [
    {
      tier: 'HIGH',
      clients: segmentData.highValue.length,
      totalAP: segmentData.totalPremiumByTier.high,
      avgAP: segmentData.avgPremiumByTier.high,
      mixPercent: totalRevenue > 0 ? (segmentData.totalPremiumByTier.high / totalRevenue) * 100 : 0
    },
    {
      tier: 'MED',
      clients: segmentData.mediumValue.length,
      totalAP: segmentData.totalPremiumByTier.medium,
      avgAP: segmentData.avgPremiumByTier.medium,
      mixPercent: totalRevenue > 0 ? (segmentData.totalPremiumByTier.medium / totalRevenue) * 100 : 0
    },
    {
      tier: 'LOW',
      clients: segmentData.lowValue.length,
      totalAP: segmentData.totalPremiumByTier.low,
      avgAP: segmentData.avgPremiumByTier.low,
      mixPercent: totalRevenue > 0 ? (segmentData.totalPremiumByTier.low / totalRevenue) * 100 : 0
    }
  ];

  return (
    <Card className="border-border/50">
      <CardContent className="p-2">
        <AnalyticsHeading title="Client Segments" />

        <AnalyticsTable
          columns={segmentColumns}
          data={segmentTableData}
          className="mb-2"
        />

        {/* Cross-Sell Opportunities */}
        {crossSell && crossSell.length > 0 && (
          <>
            <AnalyticsHeading title="Cross-Sell Targets" />
            <AnalyticsTable
              columns={[
                {
                  key: 'clientName',
                  header: 'Client',
                  render: (value: string) => (
                    <span className="font-medium truncate" title={value}>
                      {value}
                    </span>
                  )
                },
                {
                  key: 'currentProducts',
                  header: 'Has',
                  align: 'right' as const,
                  render: (value: string[]) => value.length,
                  className: 'font-mono'
                },
                {
                  key: 'missingProducts',
                  header: 'Missing',
                  align: 'right' as const,
                  render: (value: string[]) => value.length,
                  className: 'font-mono'
                },
                {
                  key: 'estimatedValue',
                  header: 'Potential',
                  align: 'right' as const,
                  render: (value: number) => formatCurrency(value),
                  className: 'font-mono font-semibold text-green-600 dark:text-green-400'
                }
              ]}
              data={crossSell.slice(0, 3)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
