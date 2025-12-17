// src/services/kpi/metricCalculationService.ts

/**
 * Metric Calculation Service
 *
 * Pure calculation functions for dashboard metrics.
 * Organized into 4 categories based on how they should be calculated:
 *
 * 1. ACTUAL TOTALS - Sum of filtered transactions (NO scaling)
 * 2. CURRENT STATE - Point-in-time metrics (no date filter)
 * 3. DERIVED METRICS - Calculated averages/rates from period data
 * 4. PACE METRICS - Forward-looking goals based on time remaining
 *
 * CRITICAL RULE: Do NOT scale historical totals. The date range filter
 * already gives us the correct period. Scaling is ONLY for pace metrics.
 */

import { getTimeRemaining } from "../../utils/dateRange";
import type {
  ActualTotalMetrics,
  CurrentStateMetrics,
  DerivedMetrics,
  PaceMetrics,
  GroupedMetrics,
  CalculatedMetrics,
  MetricCalculationInput,
} from "./types";
import type { Commission, Policy, Expense, ProductType } from "../../types";
import type {
  PolicyClient,
  PolicyClientExtended,
} from "../../types/policy.types";

/**
 * CATEGORY 1: Calculate actual historical totals for the period
 *
 * These are SUMS of all transactions in the date range.
 * NO SCALING is applied - we return the actual total.
 *
 * Example:
 * - Monthly period with $7,950 in expenses → return $7,950
 * - Weekly period with $1,200 in expenses → return $1,200
 * - Daily period with $250 in expenses → return $250
 */
export function calculateActualTotals(
  periodCommissions: Commission[],
  periodExpenses: Expense[],
  periodPolicies: Policy[],
): ActualTotalMetrics {
  // Commission metrics - use advanceAmount (total commission value)
  const commissionEarned = periodCommissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

  const commissionPending = periodCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

  const commissionCount = periodCommissions.length;

  // Expense metrics
  const totalExpenses = periodExpenses.reduce(
    (sum, e) => sum + (e.amount || 0),
    0,
  );
  const expenseCount = periodExpenses.length;

  const recurringExpenses = periodExpenses
    .filter((e) => e.is_recurring)
    .reduce((sum, e) => sum + e.amount, 0);

  const oneTimeExpenses = totalExpenses - recurringExpenses;

  const taxDeductibleExpenses = periodExpenses
    .filter((e) => e.is_tax_deductible)
    .reduce((sum, e) => sum + e.amount, 0);

  // Net income
  const netIncome = commissionEarned - totalExpenses;

  // Policy metrics
  const premiumWritten = periodPolicies.reduce(
    (sum, p) => sum + (p.annualPremium || 0),
    0,
  );

  const commissionableValue = periodPolicies.reduce((sum, p) => {
    const premium = p.annualPremium || 0;
    const rate = p.commissionPercentage || 0;
    return sum + premium * rate;
  }, 0);

  const newPoliciesCount = periodPolicies.length;
  const cancelledCount = periodPolicies.filter(
    (p) => p.status === "cancelled",
  ).length;
  const lapsedCount = periodPolicies.filter(
    (p) => p.status === "lapsed",
  ).length;

  // Client metrics (unique clients from period policies)
  const uniqueClients = new Map<string, Policy>();
  periodPolicies.forEach((p) => {
    const key = p.client?.name;
    if (key && !uniqueClients.has(key)) {
      uniqueClients.set(key, p);
    }
  });

  const newClientsCount = uniqueClients.size;
  const clientTotalValue = periodPolicies.reduce(
    (sum, p) => sum + (p.annualPremium || 0),
    0,
  );

  return {
    commissionEarned,
    commissionPending,
    commissionCount,
    totalExpenses,
    expenseCount,
    recurringExpenses,
    oneTimeExpenses,
    taxDeductibleExpenses,
    netIncome,
    premiumWritten,
    commissionableValue,
    newPoliciesCount,
    cancelledCount,
    lapsedCount,
    newClientsCount,
    clientTotalValue,
  };
}

/**
 * CATEGORY 2: Calculate current point-in-time state
 *
 * These metrics represent the current state and do NOT change
 * based on the selected time period.
 *
 * Example:
 * - If you have 150 active policies, that's the same for daily,
 *   weekly, monthly, and yearly views.
 */
export function calculateCurrentState(
  allPolicies: Policy[],
  allCommissions: Commission[],
): CurrentStateMetrics {
  const activePolicies = allPolicies.filter(
    (p) => p.status === "active",
  ).length;
  const pendingPolicies = allPolicies.filter(
    (p) => p.status === "pending",
  ).length;
  const totalPolicies = allPolicies.length;

  // Unique clients from all policies
  const allClients = new Set(
    allPolicies
      .map((p) => p.client?.name)
      .filter((name): name is string => !!name),
  );
  const totalClients = allClients.size;

  // Pending pipeline - ALL pending commissions (not filtered by period)
  const pendingPipeline = allCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

  // Retention rate
  const retentionRate =
    totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 0;

  return {
    activePolicies,
    pendingPolicies,
    totalPolicies,
    totalClients,
    pendingPipeline,
    retentionRate,
  };
}

/**
 * CATEGORY 3: Calculate derived metrics (averages, rates, percentages)
 *
 * These are calculated from the period's actual data.
 * They are NOT scaled - they're computed from the filtered data.
 *
 * Example:
 * - Average premium for the month = total premium / policy count for
 *   policies written THIS MONTH
 */
export function calculateDerivedMetrics(
  actualTotals: ActualTotalMetrics,
  currentState: CurrentStateMetrics,
  periodCommissions: Commission[],
  periodPolicies: Policy[],
): DerivedMetrics {
  const {
    premiumWritten,
    newPoliciesCount,
    commissionEarned,
    commissionCount,
    totalExpenses,
    expenseCount,
    lapsedCount,
    cancelledCount,
    newClientsCount,
    clientTotalValue,
    netIncome,
  } = actualTotals;

  // Average premium
  const averagePremium =
    newPoliciesCount > 0 ? premiumWritten / newPoliciesCount : 0;

  // Average commission rate (as percentage)
  const averageCommissionRate =
    commissionCount > 0
      ? periodCommissions.reduce((sum, c) => sum + (c.commissionRate || 0), 0) /
        commissionCount
      : 0;

  // Average commission amount
  const totalCommissionValue = periodCommissions.reduce(
    (sum, c) => sum + (c.advanceAmount || 0),
    0,
  );
  const averageCommissionAmount =
    commissionCount > 0 ? totalCommissionValue / commissionCount : 0;

  // Average expense amount
  const averageExpenseAmount =
    expenseCount > 0 ? totalExpenses / expenseCount : 0;

  // Lapse rate
  const lapsedRate =
    newPoliciesCount > 0 ? (lapsedCount / newPoliciesCount) * 100 : 0;

  // Cancellation rate
  const cancellationRate =
    newPoliciesCount > 0 ? (cancelledCount / newPoliciesCount) * 100 : 0;

  // Average client value
  const avgClientValue =
    newClientsCount > 0 ? clientTotalValue / newClientsCount : 0;

  // Average client age
  const uniqueClients = new Map<string, PolicyClient | PolicyClientExtended>();
  periodPolicies.forEach((p) => {
    const key = p.client?.name;
    if (key && p.client && !uniqueClients.has(key)) {
      uniqueClients.set(key, p.client);
    }
  });

  let totalAge = 0;
  let ageCount = 0;
  uniqueClients.forEach((client) => {
    if (client?.age) {
      totalAge += client.age;
      ageCount++;
    }
  });
  const avgClientAge = ageCount > 0 ? totalAge / ageCount : 0;

  // Profit margin
  const profitMargin =
    commissionEarned > 0 ? (netIncome / commissionEarned) * 100 : 0;

  // Policies per client
  const policiesPerClient =
    currentState.totalClients > 0
      ? currentState.totalPolicies / currentState.totalClients
      : 0;

  // Average commission per policy
  const avgCommissionPerPolicy =
    newPoliciesCount > 0
      ? commissionEarned / newPoliciesCount
      : averagePremium * (averageCommissionRate / 100);

  return {
    averagePremium,
    averageCommissionRate,
    averageCommissionAmount,
    averageExpenseAmount,
    lapsedRate,
    cancellationRate,
    avgClientValue,
    avgClientAge,
    profitMargin,
    policiesPerClient,
    avgCommissionPerPolicy,
  };
}

/**
 * CATEGORY 4: Calculate pace metrics (forward-looking goals)
 *
 * These are goal-based calculations using time remaining and targets.
 * This is the ONLY place where time-based scaling makes sense.
 *
 * Example:
 * - If you need $5,000 more this month and have 10 days left,
 *   you need $500/day. This is not scaling historical data,
 *   it's calculating future requirements.
 */
export function calculatePaceMetrics(
  actualTotals: ActualTotalMetrics,
  derived: DerivedMetrics,
  timePeriod: string,
): PaceMetrics {
  const { netIncome } = actualTotals;
  const { avgCommissionPerPolicy } = derived;

  const surplusDeficit = netIncome;
  const breakevenNeeded = surplusDeficit < 0 ? Math.abs(surplusDeficit) : 0;

  // Calculate policies needed to break even
  const policiesNeeded =
    avgCommissionPerPolicy > 0
      ? Math.ceil(breakevenNeeded / avgCommissionPerPolicy)
      : 0;

  // Get time remaining in the current period
  const timeRemaining = getTimeRemaining(timePeriod as any);
  const daysRemaining = Math.max(
    1,
    timeRemaining.days + timeRemaining.hours / 24,
  );

  // Calculate per-period targets
  let dailyTarget = 0;
  let weeklyTarget = 0;
  let monthlyTarget = 0;
  let policiesPerDayNeeded = 0;
  let breakevenPerDay = 0;
  let breakevenPerWeek = 0;
  let breakevenPerMonth = 0;

  if (policiesNeeded > 0) {
    policiesPerDayNeeded = policiesNeeded / daysRemaining;
    dailyTarget = Math.ceil(policiesPerDayNeeded);

    switch (timePeriod) {
      case "daily":
        // For daily, we need to close this many policies today
        dailyTarget = policiesNeeded;
        breakevenPerDay = breakevenNeeded;
        breakevenPerWeek = breakevenNeeded * 7;
        breakevenPerMonth = breakevenNeeded * 30;
        break;

      case "weekly":
        // For weekly, distribute over remaining days
        weeklyTarget = policiesNeeded;
        breakevenPerWeek = breakevenNeeded;
        breakevenPerDay = breakevenNeeded / 7;
        breakevenPerMonth = breakevenNeeded * 4.33;
        break;

      case "monthly":
        // For monthly, distribute over remaining days
        weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
        monthlyTarget = policiesNeeded;
        breakevenPerMonth = breakevenNeeded;
        breakevenPerWeek = breakevenNeeded / 4.33;
        breakevenPerDay = breakevenNeeded / 30;
        break;

      case "yearly":
        {
          // For yearly, calculate monthly and weekly targets
          const monthsRemaining = 12 - new Date().getMonth();
          weeklyTarget = Math.ceil(policiesPerDayNeeded * 7);
          monthlyTarget = Math.ceil(
            policiesNeeded / Math.max(1, monthsRemaining),
          );
          breakevenPerMonth = breakevenNeeded / 12;
          breakevenPerWeek = breakevenNeeded / 52;
          breakevenPerDay = breakevenNeeded / 365;
        }
        break;
    }
  }

  return {
    surplusDeficit,
    breakevenNeeded,
    policiesNeeded,
    policiesPerDayNeeded,
    dailyTarget,
    weeklyTarget,
    monthlyTarget,
    breakevenPerDay,
    breakevenPerWeek,
    breakevenPerMonth,
    daysRemaining: timeRemaining.days,
    hoursRemaining: timeRemaining.hours,
  };
}

/**
 * Calculate grouped/segmented metrics
 */
export function calculateGroupedMetrics(
  periodCommissions: Commission[],
  periodExpenses: Expense[],
  periodPolicies: Policy[],
): GroupedMetrics {
  // Commission by carrier
  const commissionByCarrier: Record<string, number> = {};
  periodCommissions.forEach((c) => {
    const carrierId = c.carrierId;
    if (carrierId) {
      commissionByCarrier[carrierId] =
        (commissionByCarrier[carrierId] || 0) + (c.advanceAmount || 0);
    }
  });

  // Commission by product
  const commissionByProduct: Record<ProductType, number> = {} as Record<
    ProductType,
    number
  >;
  periodCommissions.forEach((c) => {
    if (c.product) {
      commissionByProduct[c.product] =
        (commissionByProduct[c.product] || 0) + (c.advanceAmount || 0);
    }
  });

  // Commission by state
  const commissionByState: Record<string, number> = {};
  periodCommissions.forEach((c) => {
    const state = c.client?.state || "Unknown";
    commissionByState[state] =
      (commissionByState[state] || 0) + (c.advanceAmount || 0);
  });

  // Expenses by category
  const expensesByCategory: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    const category = e.category || "Uncategorized";
    expensesByCategory[category] =
      (expensesByCategory[category] || 0) + e.amount;
  });

  // Clients by state
  const clientsByState: Record<string, number> = {};
  const uniqueClients = new Map<string, PolicyClient | PolicyClientExtended>();
  periodPolicies.forEach((p) => {
    const key = p.client?.name;
    if (key && p.client && !uniqueClients.has(key)) {
      uniqueClients.set(key, p.client);
      const state = p.client.state || "Unknown";
      clientsByState[state] = (clientsByState[state] || 0) + 1;
    }
  });

  return {
    commissionByCarrier,
    commissionByProduct,
    commissionByState,
    expensesByCategory,
    clientsByState,
  };
}

/**
 * MAIN CALCULATION FUNCTION
 *
 * Orchestrates all calculations and returns complete metrics package.
 * This is the primary function to call from hooks.
 */
export function calculateAllMetrics(
  input: MetricCalculationInput,
): CalculatedMetrics {
  const {
    allPolicies,
    periodPolicies,
    allCommissions,
    periodCommissions,
    periodExpenses,
    timePeriod,
    dateRange,
  } = input;

  // Calculate all 4 categories
  const actualTotals = calculateActualTotals(
    periodCommissions,
    periodExpenses,
    periodPolicies,
  );
  const currentState = calculateCurrentState(allPolicies, allCommissions);
  const derived = calculateDerivedMetrics(
    actualTotals,
    currentState,
    periodCommissions,
    periodPolicies,
  );
  const pace = calculatePaceMetrics(actualTotals, derived, timePeriod);
  const grouped = calculateGroupedMetrics(
    periodCommissions,
    periodExpenses,
    periodPolicies,
  );

  return {
    actualTotals,
    currentState,
    derived,
    pace,
    grouped,
    timePeriod,
    dateRange,
  };
}
