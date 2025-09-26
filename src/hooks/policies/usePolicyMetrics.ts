// /home/nneessen/projects/commissionTracker/src/hooks/policies/usePolicyMetrics.ts

import { Policy, PolicyStatus, ProductType, PolicySummary } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const STORAGE_KEY = 'policies';

export interface PolicyMetrics extends PolicySummary {
  expiringPolicies: Policy[];
  recentPolicies: Policy[];
  policiesByCarrier: Record<string, number>;
  policiesByState: Record<string, number>;
  averageCommissionRate: number;
  monthlyRecurringRevenue: number;
  yearlyRecurringRevenue: number;
}

export interface UsePolicyMetricsResult {
  metrics: PolicyMetrics;
  getExpiringPolicies: (days?: number) => Policy[];
  getPoliciesByClient: (clientName: string) => Policy[];
  getPoliciesByCarrier: (carrierId: string) => Policy[];
  isDuplicatePolicyNumber: (policyNumber: string, excludeId?: string) => boolean;
}

/**
 * Hook for calculating policy metrics and analytics
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function usePolicyMetrics(): UsePolicyMetricsResult {
  const [policies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);

  // Parse dates for accurate calculations
  const parsedPolicies: Policy[] = policies.map(p => ({
    ...p,
    effectiveDate: new Date(p.effectiveDate),
    expirationDate: p.expirationDate ? new Date(p.expirationDate) : undefined,
    createdAt: new Date(p.createdAt),
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt)
  }));

  // Calculate base metrics
  const activePolicies = parsedPolicies.filter(p => p.status === 'active');
  const pendingPolicies = parsedPolicies.filter(p => p.status === 'pending');
  const lapsedPolicies = parsedPolicies.filter(p => p.status === 'lapsed');

  // Policies by status
  const policiesByStatus: Record<PolicyStatus, number> = {
    active: 0,
    pending: 0,
    lapsed: 0,
    cancelled: 0,
    matured: 0
  };

  parsedPolicies.forEach(policy => {
    policiesByStatus[policy.status] = (policiesByStatus[policy.status] || 0) + 1;
  });

  // Policies by product
  const policiesByProduct: Record<ProductType, number> = {
    term_life: 0,
    whole_life: 0,
    universal_life: 0,
    indexed_universal_life: 0,
    accidental_life: 0
  };

  parsedPolicies.forEach(policy => {
    policiesByProduct[policy.product] = (policiesByProduct[policy.product] || 0) + 1;
  });

  // Policies by carrier
  const policiesByCarrier: Record<string, number> = {};
  parsedPolicies.forEach(policy => {
    policiesByCarrier[policy.carrierId] = (policiesByCarrier[policy.carrierId] || 0) + 1;
  });

  // Policies by state
  const policiesByState: Record<string, number> = {};
  parsedPolicies.forEach(policy => {
    const state = policy.client.state;
    policiesByState[state] = (policiesByState[state] || 0) + 1;
  });

  // Financial metrics
  const totalAnnualPremium = parsedPolicies.reduce((sum, p) => sum + p.annualPremium, 0);
  const totalExpectedCommission = parsedPolicies.reduce(
    (sum, p) => sum + (p.annualPremium * p.commissionPercentage / 100),
    0
  );
  const averagePolicyValue = parsedPolicies.length > 0 ? totalAnnualPremium / parsedPolicies.length : 0;
  const averageCommissionRate = parsedPolicies.length > 0
    ? parsedPolicies.reduce((sum, p) => sum + p.commissionPercentage, 0) / parsedPolicies.length
    : 0;

  // Recurring revenue calculations (active policies only)
  const monthlyRecurringRevenue = activePolicies.reduce((sum, p) => {
    const monthlyCommission = (p.annualPremium * p.commissionPercentage / 100) / 12;
    return sum + monthlyCommission;
  }, 0);

  const yearlyRecurringRevenue = activePolicies.reduce((sum, p) => {
    return sum + (p.annualPremium * p.commissionPercentage / 100);
  }, 0);

  // Get policies expiring within specified days
  const getExpiringPolicies = (days: number = 30): Policy[] => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const now = new Date();

    return parsedPolicies.filter(policy => {
      if (!policy.expirationDate) return false;
      const expDate = policy.expirationDate.getTime();
      return expDate >= now.getTime() && expDate <= futureDate.getTime();
    });
  };

  // Get recent policies (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPolicies = parsedPolicies.filter(
    policy => policy.createdAt >= thirtyDaysAgo
  );

  // Get policies by client name
  const getPoliciesByClient = (clientName: string): Policy[] => {
    const searchTerm = clientName.toLowerCase();
    return parsedPolicies.filter(policy =>
      policy.client.name.toLowerCase().includes(searchTerm)
    );
  };

  // Get policies by carrier
  const getPoliciesByCarrier = (carrierId: string): Policy[] => {
    return parsedPolicies.filter(policy => policy.carrierId === carrierId);
  };

  // Check for duplicate policy number
  const isDuplicatePolicyNumber = (policyNumber: string, excludeId?: string): boolean => {
    return parsedPolicies.some(policy =>
      policy.policyNumber === policyNumber && policy.id !== excludeId
    );
  };

  const metrics: PolicyMetrics = {
    totalPolicies: parsedPolicies.length,
    activePolicies: activePolicies.length,
    pendingPolicies: pendingPolicies.length,
    lapsedPolicies: lapsedPolicies.length,
    totalAnnualPremium,
    totalExpectedCommission,
    averagePolicyValue,
    policiesByStatus,
    policiesByProduct,
    expiringPolicies: getExpiringPolicies(30),
    recentPolicies,
    policiesByCarrier,
    policiesByState,
    averageCommissionRate,
    monthlyRecurringRevenue,
    yearlyRecurringRevenue
  };

  return {
    metrics,
    getExpiringPolicies,
    getPoliciesByClient,
    getPoliciesByCarrier,
    isDuplicatePolicyNumber
  };
}