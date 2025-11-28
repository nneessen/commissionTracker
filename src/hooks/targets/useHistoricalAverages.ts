// src/hooks/targets/useHistoricalAverages.ts

import { useMemo } from 'react';
import { usePolicies } from '../policies/usePolicies';
import { useExpenses } from '../expenses/useExpenses';
import { useUserCommissionProfile } from '../commissions/useUserCommissionProfile';
import { HistoricalAverages } from '../../services/targets/targetsCalculationService';

/**
 * Hook to calculate historical averages from user's actual data
 * Used for intelligent target calculations
 *
 * CRITICAL: Now uses REAL commission rates from comp_guide table
 * based on user's contract level and historical product mix
 */
export function useHistoricalAverages(): {
  averages: HistoricalAverages;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: policies = [], isLoading: policiesLoading } = usePolicies();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const {
    data: commissionProfile,
    isLoading: profileLoading,
    error: profileError
  } = useUserCommissionProfile();

  const isLoading = policiesLoading || expensesLoading || profileLoading;

  // Calculate averages from historical data - MEMOIZED to prevent infinite loops
  // FORCE RECALCULATION when policies change by including policies.length in deps
  const averages: HistoricalAverages = useMemo(() => {
    // CRITICAL: No arbitrary fallbacks! If no commission data, show error
    if (!commissionProfile) {
      return {
        avgCommissionRate: 0,
        avgPolicyPremium: 0,
        avgPoliciesPerMonth: 0,
        avgExpensesPerMonth: 0,
        persistency13Month: 0,
        persistency25Month: 0,
        hasData: false,
      };
    }

    // Use REAL commission rate from comp_guide (not historical guesses!)
    // This is premium-weighted based on user's actual product mix
    const avgCommissionRate = commissionProfile.recommendedRate;

    // Calculate average policy premium from ACTIVE policies first, then all policies
    // CRITICAL: This must recalculate every time policies change!
    const activePolicies = policies.filter(p => p.status === 'active');
    const avgPolicyPremium = activePolicies.length > 0
      ? activePolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) / activePolicies.length
      : policies.length > 0
        ? policies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) / policies.length
        : 2000; // Default to $2,000 only if NO policies exist

    // Calculate average policies per month
    // Look at the last 12 months of data
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    const monthlyPolicyCounts: number[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPolicies = policies.filter(p => {
        const policyDate = new Date(p.createdAt);
        return policyDate >= monthStart && policyDate <= monthEnd;
      });

      if (monthPolicies.length > 0) {
        monthlyPolicyCounts.push(monthPolicies.length);
      }
    }

    const avgPoliciesPerMonth = monthlyPolicyCounts.length > 0
      ? monthlyPolicyCounts.reduce((sum, count) => sum + count, 0) / monthlyPolicyCounts.length
      : 8; // Default to 8 policies per month

    // Calculate average monthly expenses
    const monthlyExpenseTotals: number[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthExpenses = expenses.filter(e => {
        const expenseDate = e.date ? new Date(e.date) : new Date(e.created_at);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      if (monthExpenses.length > 0) {
        const monthTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        monthlyExpenseTotals.push(monthTotal);
      }
    }

    const avgExpensesPerMonth = monthlyExpenseTotals.length > 0
      ? monthlyExpenseTotals.reduce((sum, total) => sum + total, 0) / monthlyExpenseTotals.length
      : 5000; // Default to $5,000

    // Calculate persistency rates
    // 13-month persistency: policies still active after 13 months
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(now.getMonth() - 13);

    const policiesFrom13MonthsAgo = policies.filter(p => {
      const policyDate = new Date(p.effectiveDate || p.createdAt);
      return policyDate <= thirteenMonthsAgo;
    });

    const still_active_13Month = policiesFrom13MonthsAgo.filter(p => p.status === 'active').length;
    const persistency13Month = policiesFrom13MonthsAgo.length > 0
      ? still_active_13Month / policiesFrom13MonthsAgo.length
      : 0.85; // Default to 85%

    // 25-month persistency
    const twentyFiveMonthsAgo = new Date();
    twentyFiveMonthsAgo.setMonth(now.getMonth() - 25);

    const policiesFrom25MonthsAgo = policies.filter(p => {
      const policyDate = new Date(p.effectiveDate || p.createdAt);
      return policyDate <= twentyFiveMonthsAgo;
    });

    const stillActive25Month = policiesFrom25MonthsAgo.filter(p => p.status === 'active').length;
    const persistency25Month = policiesFrom25MonthsAgo.length > 0
      ? stillActive25Month / policiesFrom25MonthsAgo.length
      : 0.75; // Default to 75%

    return {
      avgCommissionRate,
      avgPolicyPremium,
      avgPoliciesPerMonth,
      avgExpensesPerMonth,
      persistency13Month,
      persistency25Month,
      hasData: true,
    };
  }, [commissionProfile, policies, expenses, policies.length, expenses.length]);

  return {
    averages,
    isLoading,
    error: profileError,
  };
}