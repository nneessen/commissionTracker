// src/hooks/commissions/useCommissionMetrics.ts

import { useQuery } from "@tanstack/react-query";
import { commissionService } from "../../services";
import { CommissionSummary } from "../../types/commission.types";

export interface UseCommissionMetricsOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch and calculate commission metrics using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with commission metrics
 */
export function useCommissionMetrics(options?: UseCommissionMetricsOptions) {
  return useQuery({
    queryKey: ["commission-metrics"],
    queryFn: async () => {
      // Get all commissions
      const commissions = await commissionService.getAll();

      // Calculate metrics
      const totalCommissions = commissions.reduce(
        (sum, c) => sum + (c.amount ?? 0),
        0,
      );
      const totalPremiums = 0; // Premium data lives on policies, not commissions
      const averageCommissionRate = 0; // Commission rate lives on policies, not commissions

      // Top carriers — carrierId is on policies, not commissions.
      // Without a join, we group all commissions under "unknown".
      const topCarriers: {
        carrierId: string;
        carrierName: string;
        totalCommissions: number;
        count: number;
      }[] = [
        {
          carrierId: "unknown",
          carrierName: "Unknown",
          totalCommissions: totalCommissions,
          count: commissions.length,
        },
      ];

      // Product breakdown — product is on policies, not commissions.
      const productBreakdown = [
        {
          product: "unknown" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          count: commissions.length,
          totalCommissions: totalCommissions,
        },
      ];

      // State breakdown — client data is on policies, not commissions.
      const stateBreakdown = [
        {
          state: "Unknown",
          count: commissions.length,
          totalCommissions: totalCommissions,
        },
      ];

      const summaryData: CommissionSummary = {
        totalCommissions,
        totalPremiums,
        averageCommissionRate,
        commissionCount: commissions.length,
        topCarriers,
        productBreakdown,
        stateBreakdown,
      };

      return summaryData;
    },
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2 minutes default (metrics change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
