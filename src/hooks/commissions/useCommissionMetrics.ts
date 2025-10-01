// src/hooks/commissions/useCommissionMetrics.ts
import { logger } from '../../services/base/logger';
import { useState, useEffect } from 'react';
import { Commission, CommissionSummary } from '../../types/commission.types';
import { commissionService } from '../../services';
import { useCarriers } from '../useCarriers';

export interface UseCommissionMetricsResult {
  metrics: CommissionSummary | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
}

export function useCommissionMetrics(): UseCommissionMetricsResult {
  const [metrics, setMetrics] = useState<CommissionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { getCarrierById } = useCarriers();

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
          const carrier = getCarrierById(commission.carrierId);
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

        setMetrics(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load commission metrics');
        logger.error('Error loading commission metrics', err instanceof Error ? err : String(err), 'Migration');
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [refreshKey, getCarrierById]);

  const clearError = () => setError(null);
  const refresh = () => setRefreshKey(key => key + 1);

  return {
    metrics,
    isLoading,
    error,
    clearError,
    refresh,
  };
}