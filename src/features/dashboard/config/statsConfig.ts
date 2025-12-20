// src/features/dashboard/config/statsConfig.ts

import { TimePeriod, getPeriodLabel } from "../../../utils/dateRange";
import { StatItemConfig } from "../../../types/dashboard.types";
import { formatCurrency } from "../../../lib/format";
import { getPeriodSuffix } from "../../../utils/dashboardCalculations";
import { METRIC_COLORS } from "../../../constants/dashboard";
import type { DashboardFeatures } from "../../../hooks/dashboard";

interface StatsConfigParams {
  timePeriod: TimePeriod;
  periodCommissions: {
    earned: number; // Total entitled (earned + paid statuses)
    paid: number; // Money actually received (paid status only)
    averageAmount: number;
    averageRate: number;
  };
  periodExpenses: {
    total: number;
  };
  periodPolicies: {
    newCount: number;
    averagePremium: number;
  };
  periodClients: {
    newCount: number;
  };
  periodAnalytics: {
    surplusDeficit: number;
    breakevenNeeded: number;
    paceMetrics: {
      dailyTarget: number;
      weeklyTarget: number;
      monthlyTarget: number;
    };
    policiesNeeded: number;
  };
  currentState: {
    activePolicies: number;
    totalPolicies: number;
    totalClients: number;
    pendingPipeline: number;
    retentionRate: number;
  };
  derivedMetrics: {
    lapsedRate: number;
    avgClientValue: number;
  };
  breakevenDisplay: number;
  policiesNeededDisplay: number;
  chargebackSummary?: {
    totalChargebacks: number;
    totalChargebackAmount: number;
    totalAdvances: number;
    totalEarned: number;
    chargebackRatePercentage: number;
    chargedBackCount: number;
    highRiskCount: number;
    atRiskAmount: number;
  };
  /** Dashboard feature access for gating */
  features?: DashboardFeatures;
}

export function generateStatsConfig(
  params: StatsConfigParams,
): StatItemConfig[] {
  const {
    timePeriod,
    periodCommissions,
    periodExpenses,
    periodAnalytics,
    currentState,
    breakevenDisplay,
    policiesNeededDisplay,
    features,
  } = params;

  const periodSuffix = getPeriodSuffix(timePeriod);
  const periodLabel = getPeriodLabel(timePeriod);

  // Check if user can view expenses (determines gating for expense-dependent stats)
  const canViewExpenses = features?.canViewExpenses ?? true;

  // Key Metrics: Core financial health snapshot (no duplicates with other sections)
  return [
    {
      label: `${periodLabel} Commission`,
      value: formatCurrency(periodCommissions.paid),
      trend: periodAnalytics.surplusDeficit >= 0 ? "up" : "down",
      color:
        periodCommissions.paid > 0
          ? METRIC_COLORS.COMMISSION_EARNED
          : METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: `${periodLabel} Commission Paid`,
        description: `Commission payments received during the ${timePeriod.toLowerCase()} period.`,
        formula: `Sum of commission amounts where status='paid'`,
      },
    },
    {
      label: `${periodLabel} Expenses`,
      value: formatCurrency(periodExpenses.total),
      color: METRIC_COLORS.EXPENSES,
      tooltip: {
        title: `${periodLabel} Total Expenses`,
        description: `Total expenses during the ${timePeriod.toLowerCase()} period.`,
        formula: `SUM(amount) WHERE date IN period`,
      },
      // Gate: Requires expenses feature (Starter+)
      gated: !canViewExpenses,
      gatedTooltip: "Upgrade to Starter to track expenses",
    },
    {
      label: `${periodLabel} Net Income`,
      value: formatCurrency(Math.abs(periodAnalytics.surplusDeficit)),
      trend: periodAnalytics.surplusDeficit >= 0 ? "up" : "down",
      color:
        periodAnalytics.surplusDeficit >= 0
          ? METRIC_COLORS.NET_INCOME_POSITIVE
          : METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: `${periodLabel} Net Income`,
        description: `Net income (Commission - Expenses) for the ${timePeriod.toLowerCase()} period.`,
        formula: `Commission Earned - Total Expenses`,
      },
      // Gate: Requires expenses feature (needs expenses to calculate)
      gated: !canViewExpenses,
      gatedTooltip: "Upgrade to Starter to see net income",
    },
    {
      label: "Pending Pipeline",
      value: formatCurrency(currentState.pendingPipeline),
      color: METRIC_COLORS.PENDING_PIPELINE,
      tooltip: {
        title: "Pending Pipeline",
        description: "Total commissions owed but not yet paid.",
        formula: "Sum of commissions where status is pending or earned",
      },
    },
    {
      label: "Breakeven" + periodSuffix,
      value: formatCurrency(Math.max(0, breakevenDisplay)),
      color:
        periodAnalytics.breakevenNeeded <= 0
          ? METRIC_COLORS.BREAKEVEN_MET
          : METRIC_COLORS.BREAKEVEN,
      tooltip: {
        title: "Breakeven Needed" + periodSuffix,
        description: `Commission needed to cover expenses.`,
        formula: "IF deficit: (Expenses - Commission), ELSE: 0",
      },
      // Gate: Requires expenses feature (needs expenses to calculate breakeven)
      gated: !canViewExpenses,
      gatedTooltip: "Upgrade to Starter to see breakeven",
    },
    {
      label: "Policies Needed" + periodSuffix,
      value: policiesNeededDisplay.toString(),
      color: METRIC_COLORS.POLICIES_NEEDED,
      tooltip: {
        title: "Policies Needed" + periodSuffix,
        description: `Policies to sell to reach breakeven.`,
        formula: "Breakeven Needed / Avg Commission per Policy",
      },
      // Gate: Requires expenses feature (depends on breakeven calculation)
      gated: !canViewExpenses,
      gatedTooltip: "Upgrade to Starter to see policies needed",
    },
    // Chargeback metric - shows total chargebacks for visibility
    ...(params.chargebackSummary &&
    params.chargebackSummary.totalChargebackAmount > 0
      ? [
          {
            label: "Chargebacks",
            value: formatCurrency(
              params.chargebackSummary.totalChargebackAmount,
            ),
            color: METRIC_COLORS.CHARGEBACK || "#ef4444", // Red for chargebacks
            trend: "down" as const,
            tooltip: {
              title: "Total Chargebacks",
              description: `Total amount lost to chargebacks (${params.chargebackSummary.totalChargebacks} policies).`,
              formula: `Sum of chargeback amounts where status='charged_back'`,
            },
          },
        ]
      : []),
  ];
}
