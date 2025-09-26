// src/hooks/commissions/useCommissionMetrics.ts
import { useState, useEffect } from 'react';
import { Commission, CommissionSummary } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useCarriers } from '../useCarriers';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseCommissionMetricsResult {
  metrics: CommissionSummary;
  isLoading: boolean;
  refresh: () => void;
}

export function useCommissionMetrics(): UseCommissionMetricsResult {
  const [commissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const { getCarrierById } = useCarriers();
  const [metrics, setMetrics] = useState<CommissionSummary>({
    totalCommissions: 0,
    totalPremiums: 0,
    averageCommissionRate: 0,
    commissionCount: 0,
    topCarriers: [],
    productBreakdown: [],
    stateBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);

    // Calculate metrics
    const totalCommissions = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPremiums = commissions.reduce((sum, c) => sum + c.annualPremium, 0);
    const averageCommissionRate = commissions.length > 0
      ? commissions.reduce((sum, c) => sum + c.commissionRate, 0) / commissions.length
      : 0;

    // Top carriers
    const carrierMap = new Map<string, { name: string; totalCommissions: number; count: number }>();
    commissions.forEach((commission) => {
      const carrier = getCarrierById(commission.carrierId);
      const carrierName = carrier?.name || 'Unknown';
      const existing = carrierMap.get(commission.carrierId) || {
        name: carrierName,
        totalCommissions: 0,
        count: 0
      };
      carrierMap.set(commission.carrierId, {
        name: carrierName,
        totalCommissions: existing.totalCommissions + commission.commissionAmount,
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
    const productMap = new Map<string, { count: number; totalCommissions: number }>();
    commissions.forEach((commission) => {
      const existing = productMap.get(commission.product) || {
        count: 0,
        totalCommissions: 0
      };
      productMap.set(commission.product, {
        count: existing.count + 1,
        totalCommissions: existing.totalCommissions + commission.commissionAmount,
      });
    });

    const productBreakdown = Array.from(productMap.entries()).map(([product, data]) => ({
      product: product as any,
      count: data.count,
      totalCommissions: data.totalCommissions,
    }));

    // State breakdown
    const stateMap = new Map<string, { count: number; totalCommissions: number }>();
    commissions.forEach((commission) => {
      const existing = stateMap.get(commission.client.state) || {
        count: 0,
        totalCommissions: 0
      };
      stateMap.set(commission.client.state, {
        count: existing.count + 1,
        totalCommissions: existing.totalCommissions + commission.commissionAmount,
      });
    });

    const stateBreakdown = Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      count: data.count,
      totalCommissions: data.totalCommissions,
    }));

    // Status breakdown
    const statusMap = new Map<string, { count: number; totalCommissions: number }>();
    commissions.forEach((commission) => {
      const existing = statusMap.get(commission.status) || {
        count: 0,
        totalCommissions: 0
      };
      statusMap.set(commission.status, {
        count: existing.count + 1,
        totalCommissions: existing.totalCommissions + commission.commissionAmount,
      });
    });

    const statusBreakdown = Array.from(statusMap.entries()).map(([status, data]) => ({
      status: status as any,
      count: data.count,
      totalCommissions: data.totalCommissions,
    }));

    setMetrics({
      totalCommissions,
      totalPremiums,
      averageCommissionRate,
      commissionCount: commissions.length,
      topCarriers,
      productBreakdown,
      stateBreakdown,
      statusBreakdown,
    });

    setIsLoading(false);
  }, [commissions, getCarrierById, refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    metrics,
    isLoading,
    refresh,
  };
}