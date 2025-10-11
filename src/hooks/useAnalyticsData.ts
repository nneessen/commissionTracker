// src/hooks/useAnalyticsData.ts

import { useMemo } from 'react';
import { usePolicies } from './policies';
import { useCommissions } from './commissions';
import { useExpenses } from './useExpenses';
import { useCarriers } from './carriers';
import {
  getCohortRetention,
  getChargebacksByCohort,
  getEarningProgressByCohort,
  getCohortSummary,
  segmentClientsByValue,
  calculateCrossSellOpportunities,
  getClientLifetimeValue,
  forecastRenewals,
  calculateChargebackRisk,
  projectGrowth,
  detectSeasonality,
  calculateContribution,
  getProductMixEvolution,
  calculateCarrierROI,
  getTopMovers,
} from '../services/analytics';

export interface UseAnalyticsDataOptions {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Centralized analytics data aggregation hook
 *
 * Combines all analytics services with TanStack Query data fetching.
 * All calculations are memoized for performance.
 *
 * @param options - Optional date range filter
 * @returns Comprehensive analytics data object
 */
export function useAnalyticsData(options?: UseAnalyticsDataOptions) {
  const { startDate, endDate } = options || {};

  // Fetch all required data from Supabase
  const { data: allPolicies = [], isLoading: policiesLoading } = usePolicies();
  const { data: allCommissions = [], isLoading: commissionsLoading } = useCommissions();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: carriers = [], isLoading: carriersLoading } = useCarriers();

  // Filter data by date range if provided
  const policies = useMemo(() => {
    if (!startDate || !endDate) return allPolicies;
    return allPolicies.filter(p => {
      const date = new Date(p.effectiveDate);
      return date >= startDate && date <= endDate;
    });
  }, [allPolicies, startDate, endDate]);

  const commissions = useMemo(() => {
    if (!startDate || !endDate) return allCommissions;
    return allCommissions.filter(c => {
      const date = new Date(c.createdAt);
      return date >= startDate && date <= endDate;
    });
  }, [allCommissions, startDate, endDate]);

  // Calculate loading state
  const isLoading = policiesLoading || commissionsLoading || expensesLoading || carriersLoading;

  // Cohort Analysis - all cohort-related metrics
  const cohortData = useMemo(() => ({
    retention: getCohortRetention(policies),
    chargebacks: getChargebacksByCohort(policies, commissions),
    earningProgress: getEarningProgressByCohort(policies, commissions),
    summary: getCohortSummary(policies, commissions),
  }), [policies, commissions]);

  // Client Segmentation - client value and opportunities
  const segmentationData = useMemo(() => ({
    segments: segmentClientsByValue(policies),
    crossSell: calculateCrossSellOpportunities(policies),
    ltv: getClientLifetimeValue(policies, commissions),
  }), [policies, commissions]);

  // Predictive Analytics - forecasting and risk
  const forecastData = useMemo(() => ({
    renewals: forecastRenewals(policies),
    chargebackRisk: calculateChargebackRisk(policies, commissions),
    growth: projectGrowth(policies, commissions),
    seasonality: detectSeasonality(policies),
  }), [policies, commissions]);

  // Performance Attribution - decomposition analysis
  // Split policies/commissions into current month and previous month for comparison
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentPolicies = useMemo(() =>
    policies.filter(p => new Date(p.effectiveDate) >= currentMonth),
    [policies]
  );

  const previousPolicies = useMemo(() =>
    policies.filter(p => {
      const date = new Date(p.effectiveDate);
      return date >= previousMonth && date < currentMonth;
    }),
    [policies]
  );

  const currentCommissions = useMemo(() =>
    commissions.filter(c => new Date(c.createdAt) >= currentMonth),
    [commissions]
  );

  const previousCommissions = useMemo(() =>
    commissions.filter(c => {
      const date = new Date(c.createdAt);
      return date >= previousMonth && date < currentMonth;
    }),
    [commissions]
  );

  const attributionData = useMemo(() => ({
    contribution: calculateContribution(currentPolicies, currentCommissions, previousPolicies, previousCommissions),
    productMix: getProductMixEvolution(policies),
    carrierROI: calculateCarrierROI(policies, commissions, carriers),
    topMovers: getTopMovers(currentPolicies, currentCommissions, previousPolicies, previousCommissions, carriers),
  }), [currentPolicies, currentCommissions, previousPolicies, previousCommissions, policies, commissions, carriers]);

  return {
    isLoading,
    cohort: cohortData,
    segmentation: segmentationData,
    forecast: forecastData,
    attribution: attributionData,
    // Raw data for custom calculations
    raw: {
      policies,
      commissions,
      expenses,
      carriers,
    },
  };
}
