// src/services/analytics/cohortService.ts

import { Policy, Commission } from '../../types';
import { format, parseISO, differenceInMonths } from 'date-fns';

/**
 * Cohort Analysis Service
 *
 * Analyzes policy performance by cohorts (groups of policies that started in the same month).
 * Tracks retention, chargebacks, and earning progress over time.
 */

export interface CohortRetentionData {
  cohortMonth: string; // "2025-01" format
  cohortLabel: string; // "Jan 2025" display format
  totalPolicies: number;
  retentionByMonth: { [monthsElapsed: number]: number }; // % still active
  activeCount: { [monthsElapsed: number]: number }; // count still active
  lapsedCount: { [monthsElapsed: number]: number };
  cancelledCount: { [monthsElapsed: number]: number };
}

export interface CohortChargebackData {
  cohortMonth: string;
  cohortLabel: string;
  totalPolicies: number;
  totalCommission: number;
  chargebackAmount: number;
  chargebackRate: number; // %
  avgMonthsToChargeback: number;
  chargebacksByMonth: { [monthsElapsed: number]: number }; // count of chargebacks
}

export interface CohortEarningProgress {
  cohortMonth: string;
  cohortLabel: string;
  totalAdvance: number;
  totalEarned: number;
  totalUnearned: number;
  earningRate: number; // % earned
  progressByMonth: { [monthsElapsed: number]: number }; // % earned at each month
}

/**
 * Get cohort retention data
 * Groups policies by effective_date month and tracks retention over time
 */
export function getCohortRetention(policies: Policy[]): CohortRetentionData[] {
  // Group policies by cohort month
  const cohortMap = new Map<string, Policy[]>();

  policies.forEach(policy => {
    const cohortMonth = format(new Date(policy.effectiveDate), 'yyyy-MM');
    if (!cohortMap.has(cohortMonth)) {
      cohortMap.set(cohortMonth, []);
    }
    cohortMap.get(cohortMonth)!.push(policy);
  });

  // Calculate retention for each cohort
  const cohortData: CohortRetentionData[] = [];
  const now = new Date();

  cohortMap.forEach((cohortPolicies, cohortMonth) => {
    const cohortDate = parseISO(`${cohortMonth}-01`);
    const totalPolicies = cohortPolicies.length;
    const retentionByMonth: { [monthsElapsed: number]: number } = {};
    const activeCount: { [monthsElapsed: number]: number } = {};
    const lapsedCount: { [monthsElapsed: number]: number } = {};
    const cancelledCount: { [monthsElapsed: number]: number } = {};

    // Calculate max months to track (from cohort start to now)
    const maxMonths = differenceInMonths(now, cohortDate);

    // For each month elapsed, calculate retention
    for (let monthsElapsed = 0; monthsElapsed <= Math.min(maxMonths, 24); monthsElapsed++) {
      // FIX: Check if policy was still active at the specific point in time
      // A policy is considered active at month X if:
      // 1. It's currently active, OR
      // 2. It was cancelled/lapsed AFTER month X
      const active = cohortPolicies.filter(p => {
        if (p.status === 'active') {
          // Currently active policies are active at all past points
          return true;
        }

        // For cancelled/lapsed policies, check if they were still active at monthsElapsed
        if ((p.status === 'cancelled' || p.status === 'lapsed') && p.updatedAt) {
          const statusChangeMonth = differenceInMonths(new Date(p.updatedAt), new Date(p.effectiveDate));
          // Policy was active if status change happened after this month
          return statusChangeMonth > monthsElapsed;
        }

        return false;
      }).length;

      // Count policies that lapsed in this specific month
      const lapsed = cohortPolicies.filter(p => {
        if (p.status === 'lapsed' && p.updatedAt) {
          const lapsedMonth = differenceInMonths(new Date(p.updatedAt), new Date(p.effectiveDate));
          return lapsedMonth === monthsElapsed;
        }
        return false;
      }).length;

      // Count policies that were cancelled in this specific month
      const cancelled = cohortPolicies.filter(p => {
        if (p.status === 'cancelled' && p.updatedAt) {
          const cancelledMonth = differenceInMonths(new Date(p.updatedAt), new Date(p.effectiveDate));
          return cancelledMonth === monthsElapsed;
        }
        return false;
      }).length;

      activeCount[monthsElapsed] = active;
      lapsedCount[monthsElapsed] = lapsed;
      cancelledCount[monthsElapsed] = cancelled;
      retentionByMonth[monthsElapsed] = totalPolicies > 0 ? (active / totalPolicies) * 100 : 0;
    }

    cohortData.push({
      cohortMonth,
      cohortLabel: format(cohortDate, 'MMM yyyy'),
      totalPolicies,
      retentionByMonth,
      activeCount,
      lapsedCount,
      cancelledCount,
    });
  });

  // Sort by cohort month (newest first)
  return cohortData.sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth));
}

/**
 * Get chargeback analysis by cohort
 * Identifies which cohorts have highest chargeback risk
 */
export function getChargebacksByCohort(
  policies: Policy[],
  commissions: Commission[]
): CohortChargebackData[] {
  // Create policy lookup map
  const policyMap = new Map(policies.map(p => [p.id, p]));

  // Group commissions by policy cohort
  const cohortMap = new Map<string, {
    policies: Set<string>;
    commissions: Commission[];
    chargebacks: Commission[];
  }>();

  commissions.forEach(commission => {
    if (!commission.policyId) return;
    const policy = policyMap.get(commission.policyId);
    if (!policy) return;

    const cohortMonth = format(new Date(policy.effectiveDate), 'yyyy-MM');

    if (!cohortMap.has(cohortMonth)) {
      cohortMap.set(cohortMonth, {
        policies: new Set(),
        commissions: [],
        chargebacks: []
      });
    }

    const cohort = cohortMap.get(cohortMonth)!;
    cohort.policies.add(policy.id);
    cohort.commissions.push(commission);

    if (commission.chargebackAmount && commission.chargebackAmount > 0) {
      cohort.chargebacks.push(commission);
    }
  });

  // Calculate chargeback metrics for each cohort
  const cohortData: CohortChargebackData[] = [];

  cohortMap.forEach((cohortInfo, cohortMonth) => {
    const cohortDate = parseISO(`${cohortMonth}-01`);
    const totalPolicies = cohortInfo.policies.size;
    const totalCommission = cohortInfo.commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const chargebackAmount = cohortInfo.chargebacks.reduce((sum, c) => sum + (c.chargebackAmount || 0), 0);
    const chargebackRate = totalCommission > 0 ? (chargebackAmount / totalCommission) * 100 : 0;

    // Calculate average months to chargeback
    let totalMonthsToChargeback = 0;
    const chargebacksByMonth: { [monthsElapsed: number]: number } = {};

    cohortInfo.chargebacks.forEach(commission => {
      if (!commission.policyId) return;
      const policy = policyMap.get(commission.policyId);
      if (policy && commission.chargebackDate) {
        const monthsToChargeback = differenceInMonths(
          new Date(commission.chargebackDate),
          new Date(policy.effectiveDate)
        );
        totalMonthsToChargeback += monthsToChargeback;
        chargebacksByMonth[monthsToChargeback] = (chargebacksByMonth[monthsToChargeback] || 0) + 1;
      }
    });

    const avgMonthsToChargeback = cohortInfo.chargebacks.length > 0
      ? totalMonthsToChargeback / cohortInfo.chargebacks.length
      : 0;

    cohortData.push({
      cohortMonth,
      cohortLabel: format(cohortDate, 'MMM yyyy'),
      totalPolicies,
      totalCommission,
      chargebackAmount,
      chargebackRate,
      avgMonthsToChargeback,
      chargebacksByMonth,
    });
  });

  // Sort by cohort month (newest first)
  return cohortData.sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth));
}

/**
 * Get earning progress by cohort
 * Tracks how much of advance commissions have been earned over time
 */
export function getEarningProgressByCohort(
  policies: Policy[],
  commissions: Commission[]
): CohortEarningProgress[] {
  // Create policy lookup map
  const policyMap = new Map(policies.map(p => [p.id, p]));

  // Group commissions by policy cohort
  const cohortMap = new Map<string, Commission[]>();

  commissions.forEach(commission => {
    if (!commission.policyId) return;
    const policy = policyMap.get(commission.policyId);
    if (!policy) return;

    const cohortMonth = format(new Date(policy.effectiveDate), 'yyyy-MM');

    if (!cohortMap.has(cohortMonth)) {
      cohortMap.set(cohortMonth, []);
    }
    cohortMap.get(cohortMonth)!.push(commission);
  });

  // Calculate earning progress for each cohort
  const cohortData: CohortEarningProgress[] = [];
  const now = new Date();

  cohortMap.forEach((cohortCommissions, cohortMonth) => {
    const cohortDate = parseISO(`${cohortMonth}-01`);
    const totalAdvance = cohortCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalEarned = cohortCommissions.reduce((sum, c) => sum + (c.earnedAmount || 0), 0);
    const totalUnearned = cohortCommissions.reduce((sum, c) => sum + (c.unearnedAmount || 0), 0);
    const earningRate = totalAdvance > 0 ? (totalEarned / totalAdvance) * 100 : 0;

    // Track earning progress month by month
    const progressByMonth: { [monthsElapsed: number]: number } = {};
    const maxMonths = differenceInMonths(now, cohortDate);

    for (let monthsElapsed = 0; monthsElapsed <= Math.min(maxMonths, 24); monthsElapsed++) {
      // Calculate earned percentage at this point in time
      const earnedAtMonth = cohortCommissions.reduce((sum, c) => {
        const monthsPaid = c.monthsPaid || 0;
        const advanceMonths = c.advanceMonths || 9;
        const earnedAtPoint = monthsPaid >= monthsElapsed
          ? (c.amount / advanceMonths) * Math.min(monthsElapsed, monthsPaid)
          : 0;
        return sum + earnedAtPoint;
      }, 0);

      progressByMonth[monthsElapsed] = totalAdvance > 0
        ? (earnedAtMonth / totalAdvance) * 100
        : 0;
    }

    cohortData.push({
      cohortMonth,
      cohortLabel: format(cohortDate, 'MMM yyyy'),
      totalAdvance,
      totalEarned,
      totalUnearned,
      earningRate,
      progressByMonth,
    });
  });

  // Sort by cohort month (newest first)
  return cohortData.sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth));
}

/**
 * Get cohort summary statistics
 */
export function getCohortSummary(policies: Policy[], commissions: Commission[]) {
  const retentionData = getCohortRetention(policies);
  const chargebackData = getChargebacksByCohort(policies, commissions);
  const earningData = getEarningProgressByCohort(policies, commissions);

  // Calculate overall averages
  const avgRetention9Month = retentionData
    .filter(c => c.retentionByMonth[9] !== undefined)
    .reduce((sum, c) => sum + c.retentionByMonth[9], 0) /
    (retentionData.filter(c => c.retentionByMonth[9] !== undefined).length || 1);

  const avgChargebackRate = chargebackData.reduce((sum, c) => sum + c.chargebackRate, 0) /
    (chargebackData.length || 1);

  const avgEarningRate = earningData.reduce((sum, c) => sum + c.earningRate, 0) /
    (earningData.length || 1);

  return {
    totalCohorts: retentionData.length,
    avgRetention9Month,
    avgChargebackRate,
    avgEarningRate,
    bestCohort: retentionData.sort((a, b) =>
      (b.retentionByMonth[9] || 0) - (a.retentionByMonth[9] || 0)
    )[0]?.cohortLabel,
    worstCohort: retentionData.sort((a, b) =>
      (a.retentionByMonth[9] || 0) - (b.retentionByMonth[9] || 0)
    )[0]?.cohortLabel,
  };
}
