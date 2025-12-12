// src/features/analytics/components/ClientSegmentation.tsx

import React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {useAnalyticsData} from '../../../hooks';
import {cn} from '@/lib/utils';
import {useAnalyticsDateRange} from '../context/AnalyticsDateContext';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

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
      <Card>
        <CardContent className="p-3">
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

  const _segmentColumns = [
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
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Client Segments</div>

        <Table className="text-[11px] mb-2">
          <TableHeader>
            <TableRow className="h-7">
              <TableHead className="p-1.5 bg-primary/5">Tier</TableHead>
              <TableHead className="p-1.5 bg-primary/5 text-right">Clients</TableHead>
              <TableHead className="p-1.5 bg-primary/5 text-right">Total AP</TableHead>
              <TableHead className="p-1.5 bg-primary/5 text-right">Avg AP</TableHead>
              <TableHead className="p-1.5 bg-primary/5 text-right">Mix %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segmentTableData.map((row, idx) => (
              <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                <TableCell className="p-1.5">
                  <span className={cn(
                    "font-medium",
                    row.tier === 'HIGH' ? "text-green-600 dark:text-green-400" :
                    row.tier === 'MED' ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {row.tier}
                  </span>
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono">{row.clients}</TableCell>
                <TableCell className="p-1.5 text-right font-mono font-semibold">
                  {formatCurrency(row.totalAP)}
                </TableCell>
                <TableCell className="p-1.5 text-right font-mono text-muted-foreground">
                  {formatCurrency(row.avgAP)}
                </TableCell>
                <TableCell className="p-1.5 text-right">
                  <span className={cn(
                    "font-mono",
                    row.tier === 'HIGH' ? "text-green-600 dark:text-green-400" :
                    row.tier === 'MED' ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  )}>
                    {row.mixPercent.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Cross-Sell Opportunities */}
        {crossSell && crossSell.length > 0 && (
          <>
            <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1 mt-2">Cross-Sell Targets</div>
            <Table className="text-[11px]">
              <TableHeader>
                <TableRow className="h-7">
                  <TableHead className="p-1.5 bg-primary/5">Client</TableHead>
                  <TableHead className="p-1.5 bg-primary/5 text-right">Has</TableHead>
                  <TableHead className="p-1.5 bg-primary/5 text-right">Missing</TableHead>
                  <TableHead className="p-1.5 bg-primary/5 text-right">Potential</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossSell.slice(0, 3).map((row: any, idx: number) => (
                  <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                    <TableCell className="p-1.5">
                      <span className="font-medium truncate" title={row.clientName}>
                        {row.clientName}
                      </span>
                    </TableCell>
                    <TableCell className="p-1.5 text-right font-mono">
                      {row.currentProducts.length}
                    </TableCell>
                    <TableCell className="p-1.5 text-right font-mono">
                      {row.missingProducts.length}
                    </TableCell>
                    <TableCell className="p-1.5 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(row.estimatedValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
