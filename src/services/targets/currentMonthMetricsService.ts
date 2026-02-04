// src/services/targets/currentMonthMetricsService.ts

import type {Policy} from '../../types/policy.types';

/**
 * Service for calculating current month metrics efficiently
 * Used for real-time target calculations based on actual performance
 */

export interface CurrentMonthMetrics {
  avgPolicyPremium: number;
  policiesSold: number;
  totalPremium: number;
  hasData: boolean;
  fallbackReason?: 'no-policies' | 'insufficient-data';
}

class CurrentMonthMetricsService {
  /**
   * Calculate average premium from current month's policies
   * Optimized for performance with single-pass calculation
   *
   * @param policies - All policies from the database
   * @returns CurrentMonthMetrics with average premium and metadata
   */
  calculateCurrentMonthAvgPremium(policies: Policy[]): CurrentMonthMetrics {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Single-pass calculation for performance
    let totalPremium = 0;
    let count = 0;

    for (const policy of policies) {
      const policyDate = new Date(policy.createdAt);

      // Only include policies created in current month
      if (policyDate >= monthStart && policyDate <= monthEnd) {
        totalPremium += policy.annualPremium || 0;
        count++;
      }
    }

    // Calculate average
    const avgPolicyPremium = count > 0 ? totalPremium / count : 0;

    return {
      avgPolicyPremium,
      policiesSold: count,
      totalPremium,
      hasData: count > 0,
      fallbackReason: count === 0 ? 'no-policies' : undefined,
    };
  }

  /**
   * Calculate average premium from current year's policies (year-to-date)
   * Provides stable averages throughout the year instead of resetting monthly
   * Optimized for performance with single-pass calculation
   *
   * @param policies - All policies from the database
   * @returns CurrentMonthMetrics with average premium and metadata
   */
  calculateCurrentYearAvgPremium(policies: Policy[]): CurrentMonthMetrics {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // Dec 31

    // Single-pass calculation for performance
    let totalPremium = 0;
    let count = 0;

    for (const policy of policies) {
      const policyDate = new Date(policy.createdAt);

      // Include policies created in current year
      if (policyDate >= yearStart && policyDate <= yearEnd) {
        totalPremium += policy.annualPremium || 0;
        count++;
      }
    }

    // Calculate average
    const avgPolicyPremium = count > 0 ? totalPremium / count : 0;

    return {
      avgPolicyPremium,
      policiesSold: count,
      totalPremium,
      hasData: count > 0,
      fallbackReason: count === 0 ? 'no-policies' : undefined,
    };
  }

  /**
   * Calculate average premium with intelligent fallback
   * If current month has insufficient data, fall back to recent months
   *
   * @param policies - All policies from the database
   * @param minPoliciesRequired - Minimum policies needed for reliable average (default: 3)
   * @returns CurrentMonthMetrics with fallback information
   */
  calculateAvgPremiumWithFallback(
    policies: Policy[],
    minPoliciesRequired: number = 3
  ): CurrentMonthMetrics {
    // Try current month first
    const currentMonth = this.calculateCurrentMonthAvgPremium(policies);

    if (currentMonth.hasData && currentMonth.policiesSold >= minPoliciesRequired) {
      return currentMonth;
    }

    // Fall back to last 3 months if current month has insufficient data
    const last3Months = this.calculateAvgPremiumForLastNMonths(policies, 3);

    if (last3Months.hasData && last3Months.policiesSold >= minPoliciesRequired) {
      return {
        ...last3Months,
        fallbackReason: 'insufficient-data',
      };
    }

    // Fall back to all active policies
    const activePolicies = policies.filter(p => p.lifecycleStatus === 'active');
    if (activePolicies.length > 0) {
      const totalPremium = activePolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0);
      return {
        avgPolicyPremium: totalPremium / activePolicies.length,
        policiesSold: activePolicies.length,
        totalPremium,
        hasData: true,
        fallbackReason: 'insufficient-data',
      };
    }

    // Fall back to all policies
    if (policies.length > 0) {
      const totalPremium = policies.reduce((sum, p) => sum + (p.annualPremium || 0), 0);
      return {
        avgPolicyPremium: totalPremium / policies.length,
        policiesSold: policies.length,
        totalPremium,
        hasData: true,
        fallbackReason: 'insufficient-data',
      };
    }

    // No data at all
    return {
      avgPolicyPremium: 2000, // Default fallback
      policiesSold: 0,
      totalPremium: 0,
      hasData: false,
      fallbackReason: 'no-policies',
    };
  }

  /**
   * Calculate average premium for the last N months
   * Optimized single-pass calculation
   *
   * @param policies - All policies from the database
   * @param months - Number of months to look back
   * @returns CurrentMonthMetrics for the period
   */
  private calculateAvgPremiumForLastNMonths(
    policies: Policy[],
    months: number
  ): CurrentMonthMetrics {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Single-pass calculation
    let totalPremium = 0;
    let count = 0;

    for (const policy of policies) {
      const policyDate = new Date(policy.createdAt);

      if (policyDate >= startDate && policyDate <= endDate) {
        totalPremium += policy.annualPremium || 0;
        count++;
      }
    }

    const avgPolicyPremium = count > 0 ? totalPremium / count : 0;

    return {
      avgPolicyPremium,
      policiesSold: count,
      totalPremium,
      hasData: count > 0,
    };
  }

  /**
   * Get display text explaining which calculation method was used
   * @param metrics - The metrics object
   * @param isYearBased - Whether the calculation is year-to-date (default: true)
   */
  getCalculationMethodText(metrics: CurrentMonthMetrics, isYearBased: boolean = true): string {
    if (!metrics.hasData) {
      return 'Using default values (no policy data available)';
    }

    if (!metrics.fallbackReason) {
      const period = isYearBased ? 'this year' : 'this month';
      return `Based on ${metrics.policiesSold} ${metrics.policiesSold === 1 ? 'policy' : 'policies'} sold ${period}`;
    }

    if (metrics.fallbackReason === 'insufficient-data') {
      return `Based on ${metrics.policiesSold} recent ${metrics.policiesSold === 1 ? 'policy' : 'policies'} (not enough current data)`;
    }

    return 'Using default values';
  }
}

export const currentMonthMetricsService = new CurrentMonthMetricsService();
