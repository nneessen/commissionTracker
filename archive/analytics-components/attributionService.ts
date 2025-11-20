// src/services/analytics/attributionService.ts

import { Policy, Commission, ProductType } from '../../types';
import { format, differenceInMonths } from 'date-fns';

/**
 * Attribution Service
 *
 * Analyzes what's driving performance changes:
 * - Volume effects (more/fewer policies)
 * - Rate effects (commission percentage changes)
 * - Mix effects (product composition changes)
 * - Carrier ROI analysis
 */

export interface ContributionBreakdown {
  totalChange: number;
  volumeEffect: number; // Change due to # of policies
  rateEffect: number; // Change due to commission rates
  mixEffect: number; // Change due to product mix
  volumePercent: number;
  ratePercent: number;
  mixPercent: number;
}

export interface ProductMixEvolution {
  period: string; // "2025-01" format
  periodLabel: string; // "Jan 2025"
  productBreakdown: {
    product: ProductType;
    count: number;
    percentage: number;
    revenue: number;
  }[];
  totalPolicies: number;
  totalRevenue: number;
}

export interface CarrierROI {
  carrierId: string;
  carrierName: string;
  totalPolicies: number;
  totalPremium: number;
  avgPremium: number;
  totalCommission: number;
  avgCommissionRate: number;
  roi: number; // Commission / Premium ratio
  efficiency: number; // Commission per policy
  trend: 'improving' | 'stable' | 'declining';
}

export interface TopMover {
  type: 'carrier' | 'product' | 'state';
  name: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down';
  impact: 'high' | 'medium' | 'low';
}

/**
 * Calculate contribution breakdown (what drove the change)
 * Decomposes revenue/commission change into volume, rate, and mix effects
 */
export function calculateContribution(
  currentPeriodPolicies: Policy[],
  currentPeriodCommissions: Commission[],
  previousPeriodPolicies: Policy[],
  previousPeriodCommissions: Commission[]
): ContributionBreakdown {
  // Current period metrics
  const currentPolicies = currentPeriodPolicies.length;
  const currentCommission = currentPeriodCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  // Commission rate is already stored as decimal (0.95 for 95%) in database
  // FIX: Divide by commission count, not policy count for accurate average
  const currentAvgRate = currentPeriodCommissions.length > 0
    ? currentPeriodCommissions.reduce((sum, c) => sum + (c.commissionRate || 0), 0) / currentPeriodCommissions.length
    : 0;
  const currentAvgPremium = currentPolicies > 0
    ? currentPeriodPolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) / currentPolicies
    : 0;

  // Previous period metrics
  const previousPolicies = previousPeriodPolicies.length;
  const previousCommission = previousPeriodCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  // Commission rate is already stored as decimal (0.95 for 95%) in database
  // FIX: Divide by commission count, not policy count for accurate average
  const previousAvgRate = previousPeriodCommissions.length > 0
    ? previousPeriodCommissions.reduce((sum, c) => sum + (c.commissionRate || 0), 0) / previousPeriodCommissions.length
    : 0;
  const previousAvgPremium = previousPolicies > 0
    ? previousPeriodPolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) / previousPolicies
    : 0;

  const totalChange = currentCommission - previousCommission;

  // Volume effect: Change in number of policies (holding rate and premium constant)
  const volumeEffect = (currentPolicies - previousPolicies) * previousAvgPremium * previousAvgRate;

  // Rate effect: Change in commission rate (holding volume and premium constant)
  const rateEffect = currentPolicies * previousAvgPremium * (currentAvgRate - previousAvgRate);

  // Mix effect: Change in average premium (product mix shift)
  const mixEffect = currentPolicies * (currentAvgPremium - previousAvgPremium) * currentAvgRate;

  // Calculate percentages - preserve signs to show positive/negative contributions
  // FIX: Use actual total change for percentage calculations, not sum of absolutes
  // This way, negative effects are properly shown as reducing total commission
  const volumePercent = totalChange !== 0 ? (volumeEffect / Math.abs(totalChange)) * 100 : 0;
  const ratePercent = totalChange !== 0 ? (rateEffect / Math.abs(totalChange)) * 100 : 0;
  const mixPercent = totalChange !== 0 ? (mixEffect / Math.abs(totalChange)) * 100 : 0;

  return {
    totalChange,
    volumeEffect,
    rateEffect,
    mixEffect,
    volumePercent,
    ratePercent,
    mixPercent,
  };
}

/**
 * Get product mix evolution over time (last 12 months)
 */
export function getProductMixEvolution(policies: Policy[]): ProductMixEvolution[] {
  const evolution: ProductMixEvolution[] = [];
  const now = new Date();

  // For each of last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = format(monthDate, 'yyyy-MM');
    const monthLabel = format(monthDate, 'MMM yyyy');

    // Get policies from this month
    const monthPolicies = policies.filter(p => {
      const policyMonth = format(new Date(p.effectiveDate), 'yyyy-MM');
      return policyMonth === monthStr;
    });

    const totalPolicies = monthPolicies.length;
    const totalRevenue = monthPolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0);

    // Group by product
    const productMap = new Map<ProductType, { count: number; revenue: number }>();

    monthPolicies.forEach(policy => {
      const existing = productMap.get(policy.product) || { count: 0, revenue: 0 };
      productMap.set(policy.product, {
        count: existing.count + 1,
        revenue: existing.revenue + (policy.annualPremium || 0),
      });
    });

    const productBreakdown = Array.from(productMap.entries()).map(([product, data]) => ({
      product,
      count: data.count,
      percentage: totalPolicies > 0 ? (data.count / totalPolicies) * 100 : 0,
      revenue: data.revenue,
    }));

    evolution.push({
      period: monthStr,
      periodLabel: monthLabel,
      productBreakdown,
      totalPolicies,
      totalRevenue,
    });
  }

  return evolution;
}

/**
 * Calculate carrier ROI metrics
 */
export function calculateCarrierROI(
  policies: Policy[],
  commissions: Commission[],
  carriers: { id: string; name: string }[]
): CarrierROI[] {
  const carrierMap = new Map(carriers.map(c => [c.id, c.name]));
  const carrierMetrics = new Map<string, {
    policies: Policy[];
    commissions: Commission[];
  }>();

  // Group by carrier
  policies.forEach(policy => {
    if (!carrierMetrics.has(policy.carrierId)) {
      carrierMetrics.set(policy.carrierId, { policies: [], commissions: [] });
    }
    carrierMetrics.get(policy.carrierId)!.policies.push(policy);
  });

  commissions.forEach(commission => {
    if (!carrierMetrics.has(commission.carrierId)) {
      carrierMetrics.set(commission.carrierId, { policies: [], commissions: [] });
    }
    carrierMetrics.get(commission.carrierId)!.commissions.push(commission);
  });

  const roiMetrics: CarrierROI[] = [];

  carrierMetrics.forEach((data, carrierId) => {
    const carrierName = carrierMap.get(carrierId) || 'Unknown';
    const totalPolicies = data.policies.length;
    const totalPremium = data.policies.reduce((sum, p) => sum + (p.annualPremium || 0), 0);
    const avgPremium = totalPolicies > 0 ? totalPremium / totalPolicies : 0;
    const totalCommission = data.commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    // Commission rate stored as decimal (0.95 for 95%), multiply by 100 for display as percentage
    const avgCommissionRate = totalPolicies > 0
      ? (data.commissions.reduce((sum, c) => sum + (c.commissionRate || 0), 0) / totalPolicies) * 100
      : 0;
    const roi = totalPremium > 0 ? (totalCommission / totalPremium) * 100 : 0;
    const efficiency = totalPolicies > 0 ? totalCommission / totalPolicies : 0;

    // Calculate trend (compare last 3 months vs previous 3 months)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const recentCommission = data.commissions
      .filter(c => new Date(c.createdAt) >= threeMonthsAgo)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const previousCommission = data.commissions
      .filter(c => {
        const date = new Date(c.createdAt);
        return date >= sixMonthsAgo && date < threeMonthsAgo;
      })
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    let trend: CarrierROI['trend'] = 'stable';
    if (recentCommission > previousCommission * 1.1) trend = 'improving';
    else if (recentCommission < previousCommission * 0.9) trend = 'declining';

    roiMetrics.push({
      carrierId,
      carrierName,
      totalPolicies,
      totalPremium,
      avgPremium,
      totalCommission,
      avgCommissionRate,
      roi,
      efficiency,
      trend,
    });
  });

  // Sort by ROI (descending)
  return roiMetrics.sort((a, b) => b.roi - a.roi);
}

/**
 * Identify top movers (biggest changes positive/negative)
 */
export function getTopMovers(
  currentPeriodPolicies: Policy[],
  currentPeriodCommissions: Commission[],
  previousPeriodPolicies: Policy[],
  previousPeriodCommissions: Commission[],
  carriers: { id: string; name: string }[]
): TopMover[] {
  const topMovers: TopMover[] = [];
  const carrierMap = new Map(carriers.map(c => [c.id, c.name]));

  // Carrier movers
  const currentCarrierCommission = new Map<string, number>();
  const previousCarrierCommission = new Map<string, number>();

  currentPeriodCommissions.forEach(c => {
    const current = currentCarrierCommission.get(c.carrierId) || 0;
    currentCarrierCommission.set(c.carrierId, current + (c.amount || 0));
  });

  previousPeriodCommissions.forEach(c => {
    const previous = previousCarrierCommission.get(c.carrierId) || 0;
    previousCarrierCommission.set(c.carrierId, previous + (c.amount || 0));
  });

  const allCarrierIds = new Set([
    ...Array.from(currentCarrierCommission.keys()),
    ...Array.from(previousCarrierCommission.keys()),
  ]);

  allCarrierIds.forEach(carrierId => {
    const currentValue = currentCarrierCommission.get(carrierId) || 0;
    const previousValue = previousCarrierCommission.get(carrierId) || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    if (Math.abs(change) > 100) { // Only significant changes
      topMovers.push({
        type: 'carrier',
        name: carrierMap.get(carrierId) || 'Unknown',
        currentValue,
        previousValue,
        change,
        changePercent,
        direction: change > 0 ? 'up' : 'down',
        impact: Math.abs(change) > 1000 ? 'high' : Math.abs(change) > 500 ? 'medium' : 'low',
      });
    }
  });

  // Product movers
  const currentProductCommission = new Map<ProductType, number>();
  const previousProductCommission = new Map<ProductType, number>();

  currentPeriodCommissions.forEach(c => {
    if (c.product) {
      const current = currentProductCommission.get(c.product) || 0;
      currentProductCommission.set(c.product, current + (c.amount || 0));
    }
  });

  previousPeriodCommissions.forEach(c => {
    if (c.product) {
      const previous = previousProductCommission.get(c.product) || 0;
      previousProductCommission.set(c.product, previous + (c.amount || 0));
    }
  });

  const allProducts = new Set([
    ...Array.from(currentProductCommission.keys()),
    ...Array.from(previousProductCommission.keys()),
  ]);

  allProducts.forEach(product => {
    const currentValue = currentProductCommission.get(product) || 0;
    const previousValue = previousProductCommission.get(product) || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    if (Math.abs(change) > 100) {
      topMovers.push({
        type: 'product',
        name: product.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        currentValue,
        previousValue,
        change,
        changePercent,
        direction: change > 0 ? 'up' : 'down',
        impact: Math.abs(change) > 1000 ? 'high' : Math.abs(change) > 500 ? 'medium' : 'low',
      });
    }
  });

  // State movers
  const currentStateCommission = new Map<string, number>();
  const previousStateCommission = new Map<string, number>();

  currentPeriodPolicies.forEach(p => {
    const state = p.client?.state || 'Unknown';
    const commission = currentPeriodCommissions.find(c => c.policyId === p.id);
    if (commission) {
      const current = currentStateCommission.get(state) || 0;
      currentStateCommission.set(state, current + (commission.amount || 0));
    }
  });

  previousPeriodPolicies.forEach(p => {
    const state = p.client?.state || 'Unknown';
    const commission = previousPeriodCommissions.find(c => c.policyId === p.id);
    if (commission) {
      const previous = previousStateCommission.get(state) || 0;
      previousStateCommission.set(state, previous + (commission.amount || 0));
    }
  });

  const allStates = new Set([
    ...Array.from(currentStateCommission.keys()),
    ...Array.from(previousStateCommission.keys()),
  ]);

  allStates.forEach(state => {
    const currentValue = currentStateCommission.get(state) || 0;
    const previousValue = previousStateCommission.get(state) || 0;
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    if (Math.abs(change) > 100) {
      topMovers.push({
        type: 'state',
        name: state,
        currentValue,
        previousValue,
        change,
        changePercent,
        direction: change > 0 ? 'up' : 'down',
        impact: Math.abs(change) > 1000 ? 'high' : Math.abs(change) > 500 ? 'medium' : 'low',
      });
    }
  });

  // Sort by absolute change (biggest movers first)
  return topMovers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
}
