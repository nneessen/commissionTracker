// src/hooks/targets/useHistoricalAverages.ts

import { useMemo } from "react";
import { usePolicies } from "../policies";
import { useExpenses } from "../expenses/useExpenses";
import { useUserCommissionProfile } from "../commissions/useUserCommissionProfile";
import { HistoricalAverages } from "../../services/targets/targetsCalculationService";
import { currentMonthMetricsService } from "../../services/targets/currentMonthMetricsService";

/**
 * Hook to calculate historical averages from user's actual data
 * Used for intelligent target calculations
 *
 * CRITICAL:
 * - Uses REAL commission rates from comp_guide table based on user's contract level
 * - Calculates avgPolicyPremium from CURRENT MONTH's policies for real-time accuracy
 * - Falls back to recent months/all policies if current month has insufficient data
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
    error: profileError,
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
        projectedAnnualExpenses: 0,
        persistency13Month: 0,
        persistency25Month: 0,
        hasData: false,
      };
    }

    // Use REAL commission rate from comp_guide (not historical guesses!)
    // This is premium-weighted based on user's actual product mix
    const avgCommissionRate = commissionProfile.recommendedRate;

    // CRITICAL: Calculate average premium from CURRENT MONTH's policies
    // This gives real-time accuracy for target calculations
    // Falls back to recent months/all policies if current month has insufficient data
    const currentMonthMetrics =
      currentMonthMetricsService.calculateCurrentMonthAvgPremium(policies);
    const avgPolicyPremium =
      currentMonthMetrics.avgPolicyPremium ||
      // Fallback: calculate from all active policies if current month has no data
      (() => {
        const activePolicies = policies.filter((p) => p.status === "active");
        if (activePolicies.length > 0) {
          return (
            activePolicies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) /
            activePolicies.length
          );
        }
        if (policies.length > 0) {
          return (
            policies.reduce((sum, p) => sum + (p.annualPremium || 0), 0) /
            policies.length
          );
        }
        return 0; // NO defaults - show zero if no policies
      })();

    // Calculate average policies per month
    // Look at the last 12 months of data
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    const monthlyPolicyCounts: number[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthPolicies = policies.filter((p) => {
        const policyDate = new Date(p.createdAt);
        return policyDate >= monthStart && policyDate <= monthEnd;
      });

      if (monthPolicies.length > 0) {
        monthlyPolicyCounts.push(monthPolicies.length);
      }
    }

    const avgPoliciesPerMonth =
      monthlyPolicyCounts.length > 0
        ? monthlyPolicyCounts.reduce((sum, count) => sum + count, 0) /
          monthlyPolicyCounts.length
        : 0; // NO defaults - show zero if no data

    // Calculate average monthly expenses (for monthly display context)
    const monthlyExpenseTotals: number[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthExpenses = expenses.filter((e) => {
        const expenseDate = e.date ? new Date(e.date) : new Date(e.created_at);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      if (monthExpenses.length > 0) {
        const monthTotal = monthExpenses.reduce(
          (sum, e) => sum + (e.amount || 0),
          0,
        );
        monthlyExpenseTotals.push(monthTotal);
      }
    }

    const avgExpensesPerMonth =
      monthlyExpenseTotals.length > 0
        ? monthlyExpenseTotals.reduce((sum, total) => sum + total, 0) /
          monthlyExpenseTotals.length
        : 0; // NO defaults - show zero if no expense data

    // CRITICAL: Calculate projected annual expenses based on EXPENSE DEFINITIONS, not generated records
    // The system auto-generates future records for recurring expenses, so we need to:
    // 1. For recurring expenses: Calculate annual impact based on frequency (not sum generated records)
    // 2. For one-time expenses: Just their face value

    // Helper to calculate annual multiplier based on frequency
    const getAnnualMultiplier = (frequency: string | null): number => {
      switch (frequency) {
        case "daily":
          return 365;
        case "weekly":
          return 52;
        case "biweekly":
          return 26;
        case "monthly":
          return 12;
        case "quarterly":
          return 4;
        case "semiannually":
          return 2;
        case "annually":
          return 1;
        default:
          return 1; // One-time or unknown
      }
    };

    // Group recurring expenses by their recurring_group_id to avoid counting generated records multiple times
    const processedRecurringGroups = new Set<string>();
    let projectedAnnualExpenses = 0;

    for (const expense of expenses) {
      if (expense.is_recurring && expense.recurring_group_id) {
        // For recurring expenses, only count each group once
        if (!processedRecurringGroups.has(expense.recurring_group_id)) {
          processedRecurringGroups.add(expense.recurring_group_id);
          const multiplier = getAnnualMultiplier(expense.recurring_frequency);
          projectedAnnualExpenses += (expense.amount || 0) * multiplier;
        }
        // Skip duplicate records from the same recurring group
      } else {
        // One-time expense: just add its value (no multiplication)
        projectedAnnualExpenses += expense.amount || 0;
      }
    }

    // Calculate persistency rates
    // 13-month persistency: policies still active after 13 months
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(now.getMonth() - 13);

    const policiesFrom13MonthsAgo = policies.filter((p) => {
      const policyDate = new Date(p.effectiveDate || p.createdAt);
      return policyDate <= thirteenMonthsAgo;
    });

    const still_active_13Month = policiesFrom13MonthsAgo.filter(
      (p) => p.status === "active",
    ).length;
    const persistency13Month =
      policiesFrom13MonthsAgo.length > 0
        ? still_active_13Month / policiesFrom13MonthsAgo.length
        : 0; // NO defaults - show zero if no data

    // 25-month persistency
    const twentyFiveMonthsAgo = new Date();
    twentyFiveMonthsAgo.setMonth(now.getMonth() - 25);

    const policiesFrom25MonthsAgo = policies.filter((p) => {
      const policyDate = new Date(p.effectiveDate || p.createdAt);
      return policyDate <= twentyFiveMonthsAgo;
    });

    const stillActive25Month = policiesFrom25MonthsAgo.filter(
      (p) => p.status === "active",
    ).length;
    const persistency25Month =
      policiesFrom25MonthsAgo.length > 0
        ? stillActive25Month / policiesFrom25MonthsAgo.length
        : 0; // NO defaults - show zero if no data

    return {
      avgCommissionRate,
      avgPolicyPremium,
      avgPoliciesPerMonth,
      avgExpensesPerMonth,
      projectedAnnualExpenses,
      persistency13Month,
      persistency25Month,
      hasData: true,
    };
  }, [commissionProfile, policies, expenses]);

  return {
    averages,
    isLoading,
    error: profileError,
  };
}
