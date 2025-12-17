// src/features/analytics/components/ClientSegmentation.tsx

import React from "react";
import { useAnalyticsData } from "../../../hooks";
import { cn } from "@/lib/utils";
import { useAnalyticsDateRange } from "../context/AnalyticsDateContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Client Segments
        </div>
        <div className="p-3 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!segmentation) {
    return null;
  }

  const { segments: segmentData, crossSell } = segmentation;
  const totalRevenue =
    segmentData.totalPremiumByTier.high +
    segmentData.totalPremiumByTier.medium +
    segmentData.totalPremiumByTier.low;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const segmentTableData = [
    {
      tier: "HIGH",
      clients: segmentData.highValue.length,
      totalAP: segmentData.totalPremiumByTier.high,
      avgAP: segmentData.avgPremiumByTier.high,
      mixPercent:
        totalRevenue > 0
          ? (segmentData.totalPremiumByTier.high / totalRevenue) * 100
          : 0,
    },
    {
      tier: "MED",
      clients: segmentData.mediumValue.length,
      totalAP: segmentData.totalPremiumByTier.medium,
      avgAP: segmentData.avgPremiumByTier.medium,
      mixPercent:
        totalRevenue > 0
          ? (segmentData.totalPremiumByTier.medium / totalRevenue) * 100
          : 0,
    },
    {
      tier: "LOW",
      clients: segmentData.lowValue.length,
      totalAP: segmentData.totalPremiumByTier.low,
      avgAP: segmentData.avgPremiumByTier.low,
      mixPercent:
        totalRevenue > 0
          ? (segmentData.totalPremiumByTier.low / totalRevenue) * 100
          : 0,
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Client Segments
      </div>

      <Table className="text-[11px] mb-2">
        <TableHeader>
          <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
            <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
              Tier
            </TableHead>
            <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
              Clients
            </TableHead>
            <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
              Total AP
            </TableHead>
            <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
              Avg AP
            </TableHead>
            <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
              Mix %
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segmentTableData.map((row, idx) => (
            <TableRow
              key={idx}
              className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <TableCell className="p-1.5">
                <span
                  className={cn(
                    "font-medium",
                    row.tier === "HIGH"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : row.tier === "MED"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {row.tier}
                </span>
              </TableCell>
              <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                {row.clients}
              </TableCell>
              <TableCell className="p-1.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(row.totalAP)}
              </TableCell>
              <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                {formatCurrency(row.avgAP)}
              </TableCell>
              <TableCell className="p-1.5 text-right">
                <span
                  className={cn(
                    "font-mono",
                    row.tier === "HIGH"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : row.tier === "MED"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
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
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 mt-2">
            Cross-Sell Targets
          </div>
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Client
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Has
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Missing
                </TableHead>
                <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Potential
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-sell data type */}
              {crossSell.slice(0, 3).map((row: any, idx: number) => (
                <TableRow
                  key={idx}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <TableCell className="p-1.5">
                    <span
                      className="font-medium text-zinc-900 dark:text-zinc-100 truncate"
                      title={row.clientName}
                    >
                      {row.clientName}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                    {row.currentProducts.length}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                    {row.missingProducts.length}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.estimatedValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
