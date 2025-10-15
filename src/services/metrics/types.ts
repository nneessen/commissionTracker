// src/services/metrics/types.ts

import { TimePeriod, DateRange } from '../../utils/dateRange';
import { Commission, Policy, Expense, ProductType } from '../../types';

/**
 * METRIC CATEGORY 1: ACTUAL TOTALS
 * These are the SUM of all transactions that fall within the selected date range.
 * NO SCALING is applied - these are the actual historical totals.
 *
 * Example: If monthly period has $7,950 in expenses, that's the actual sum of all
 * expenses that occurred this month. When switching to weekly, it shows the actual
 * sum of expenses that occurred this week (NOT monthly total divided by 4).
 */
export interface ActualTotalMetrics {
  /** Total commission earned in the period (sum of all paid commissions) */
  commissionEarned: number;

  /** Total commission pending payment in the period */
  commissionPending: number;

  /** Count of commission records in the period */
  commissionCount: number;

  /** Total expenses in the period (sum of all expense amounts) */
  totalExpenses: number;

  /** Count of expense records in the period */
  expenseCount: number;

  /** Recurring expenses total */
  recurringExpenses: number;

  /** One-time expenses total */
  oneTimeExpenses: number;

  /** Tax deductible expenses total */
  taxDeductibleExpenses: number;

  /** Net income (commission earned - expenses) */
  netIncome: number;

  /** Total premium written in the period */
  premiumWritten: number;

  /** Total commissionable value (premium * commission rate) */
  commissionableValue: number;

  /** Count of new policies in the period */
  newPoliciesCount: number;

  /** Count of cancelled policies in the period */
  cancelledCount: number;

  /** Count of lapsed policies in the period */
  lapsedCount: number;

  /** Count of new clients in the period */
  newClientsCount: number;

  /** Total value of new client policies */
  clientTotalValue: number;
}

/**
 * METRIC CATEGORY 2: POINT-IN-TIME STATE
 * These represent the CURRENT state of the business, regardless of time period.
 * They do NOT change when switching between daily/weekly/monthly/yearly views.
 *
 * Example: If you have 150 active policies, that number is the same whether
 * viewing daily, weekly, monthly, or yearly dashboard.
 */
export interface CurrentStateMetrics {
  /** Total number of currently active policies */
  activePolicies: number;

  /** Total number of policies with pending status */
  pendingPolicies: number;

  /** Total number of policies ever written (all statuses) */
  totalPolicies: number;

  /** Total number of unique clients */
  totalClients: number;

  /** Total value of all pending commissions (NOT filtered by period) */
  pendingPipeline: number;

  /** Retention rate: (active / total) * 100 */
  retentionRate: number;
}

/**
 * METRIC CATEGORY 3: DERIVED METRICS
 * These are calculated from the period's data (averages, rates, percentages).
 * They are based on actual period data, not scaled.
 *
 * Example: Average premium is total premium / policy count for policies
 * written in the selected period.
 */
export interface DerivedMetrics {
  /** Average premium per policy in the period */
  averagePremium: number;

  /** Average commission rate in the period (percentage) */
  averageCommissionRate: number;

  /** Average commission amount per commission record */
  averageCommissionAmount: number;

  /** Average expense amount per expense record */
  averageExpenseAmount: number;

  /** Lapse rate: (lapsed / new policies) * 100 */
  lapsedRate: number;

  /** Cancellation rate: (cancelled / new policies) * 100 */
  cancellationRate: number;

  /** Average client lifetime value (total value / client count) */
  avgClientValue: number;

  /** Average client age */
  avgClientAge: number;

  /** Profit margin: (net income / commission earned) * 100 */
  profitMargin: number;

  /** Policies per client ratio */
  policiesPerClient: number;

  /** Average commission per policy (earned / policy count) */
  avgCommissionPerPolicy: number;
}

/**
 * METRIC CATEGORY 4: PACE METRICS
 * These are FORWARD-LOOKING calculations based on goals, deficits, and time remaining.
 * These DO use time-based calculations but NOT scaling of historical data.
 *
 * Example: If you need to earn $5,000 more this month and have 10 days left,
 * you need $500/day. This is a goal calculation, not a historical data scaling.
 */
export interface PaceMetrics {
  /** Surplus (positive) or deficit (negative) for the period */
  surplusDeficit: number;

  /** Amount needed to break even (0 if already profitable) */
  breakevenNeeded: number;

  /** Number of policies needed to break even in remaining period */
  policiesNeeded: number;

  /** Policies needed per day to hit breakeven */
  policiesPerDayNeeded: number;

  /** Daily target for policies */
  dailyTarget: number;

  /** Weekly target for policies */
  weeklyTarget: number;

  /** Monthly target for policies */
  monthlyTarget: number;

  /** Breakeven amount needed per day */
  breakevenPerDay: number;

  /** Breakeven amount needed per week */
  breakevenPerWeek: number;

  /** Breakeven amount needed per month */
  breakevenPerMonth: number;

  /** Days remaining in the current period */
  daysRemaining: number;

  /** Hours remaining in the current period */
  hoursRemaining: number;
}

/**
 * GROUPING METRICS
 * Breakdowns by carrier, product, state, category
 */
export interface GroupedMetrics {
  /** Commission earned by carrier ID */
  commissionByCarrier: Record<string, number>;

  /** Commission earned by product type */
  commissionByProduct: Record<ProductType, number>;

  /** Commission earned by state */
  commissionByState: Record<string, number>;

  /** Expenses by category */
  expensesByCategory: Record<string, number>;

  /** Clients by state */
  clientsByState: Record<string, number>;
}

/**
 * COMPLETE METRICS PACKAGE
 * All metrics returned together for easy consumption
 */
export interface CalculatedMetrics {
  /** Actual historical totals for the selected period */
  actualTotals: ActualTotalMetrics;

  /** Current point-in-time state (not period-dependent) */
  currentState: CurrentStateMetrics;

  /** Derived metrics (averages, rates, percentages) */
  derived: DerivedMetrics;

  /** Forward-looking pace and goal metrics */
  pace: PaceMetrics;

  /** Grouped/segmented metrics */
  grouped: GroupedMetrics;

  /** The time period these metrics represent */
  timePeriod: TimePeriod;

  /** The date range filter applied */
  dateRange: DateRange;
}

/**
 * INPUT DATA FOR CALCULATIONS
 * Raw data that gets fed into calculation functions
 */
export interface MetricCalculationInput {
  /** All policies (unfiltered) */
  allPolicies: Policy[];

  /** Policies filtered by date range */
  periodPolicies: Policy[];

  /** All commissions (unfiltered) */
  allCommissions: Commission[];

  /** Commissions filtered by date range */
  periodCommissions: Commission[];

  /** All expenses (unfiltered) */
  allExpenses: Expense[];

  /** Expenses filtered by date range */
  periodExpenses: Expense[];

  /** The selected time period */
  timePeriod: TimePeriod;

  /** The date range for filtering */
  dateRange: DateRange;
}
