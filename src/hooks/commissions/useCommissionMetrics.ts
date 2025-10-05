// src/hooks/commissions/useCommissionMetrics.ts

import { useQuery } from '@tanstack/react-query';
import { commissionService } from '../../services';
import { CommissionSummary } from '../../types/commission.types';
import { useCarriers } from '../carriers/useCarriers';

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
  const { data: carriers = [] } = useCarriers();

  return useQuery({
    queryKey: ['commission-metrics'],
    queryFn: async () => {
      // Get all commissions
      const commissions = await commissionService.getAll();

      // Calculate metrics
      const totalCommissions = commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0,
      );
      const totalPremiums = commissions.reduce(
        (sum, c) => sum + c.annualPremium,
        0,
      );
      const averageCommissionRate =
        commissions.length > 0
          ? commissions.reduce((sum, c) => sum + c.commissionRate, 0) /
            commissions.length
          : 0;

      // Top carriers
      const carrierMap = new Map<
        string,
        { name: string; totalCommissions: number; count: number }
      >();
      commissions.forEach((commission) => {
        const carrier = carriers.find(c => c.id === commission.carrierId);
        const carrierName = carrier?.name || "Unknown";
        const existing = carrierMap.get(commission.carrierId) || {
          name: carrierName,
          totalCommissions: 0,
          count: 0,
        };
        carrierMap.set(commission.carrierId, {
          name: carrierName,
          totalCommissions:
            existing.totalCommissions + commission.commissionAmount,
          count: existing.count + 1,
        });
      });

      const topCarriers = Array.from(carrierMap.entries())
        .map(([carrierId, data]) => ({
          carrierId,
          carrierName: data.name,
          totalCommissions: data.totalCommissions,
          count: data.count,
        }))
        .sort((a, b) => b.totalCommissions - a.totalCommissions);

      // Product breakdown
      const productMap = new Map<
        string,
        { count: number; totalCommissions: number }
      >();
      commissions.forEach((commission) => {
        const existing = productMap.get(commission.product) || {
          count: 0,
          totalCommissions: 0,
        };
        productMap.set(commission.product, {
          count: existing.count + 1,
          totalCommissions:
            existing.totalCommissions + commission.commissionAmount,
        });
      });

      const productBreakdown = Array.from(productMap.entries()).map(
        ([product, data]) => ({
          product: product as any,
          count: data.count,
          totalCommissions: data.totalCommissions,
        }),
      );

      // State breakdown
      const stateMap = new Map<
        string,
        { count: number; totalCommissions: number }
      >();
      commissions.forEach((commission) => {
        const clientState = commission.client.state || commission.client.name.split(' ').pop() || 'Unknown';
        const existing = stateMap.get(clientState) || {
          count: 0,
          totalCommissions: 0,
        };
        stateMap.set(clientState, {
          count: existing.count + 1,
          totalCommissions:
            existing.totalCommissions + commission.commissionAmount,
        });
      });

      const stateBreakdown = Array.from(stateMap.entries()).map(
        ([state, data]) => ({
          state,
          count: data.count,
          totalCommissions: data.totalCommissions,
        }),
      );

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
