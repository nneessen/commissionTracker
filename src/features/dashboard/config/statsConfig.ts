// src/features/dashboard/config/statsConfig.ts

import { TimePeriod, getPeriodLabel } from "../../../utils/dateRange";
import { StatItemConfig } from "../../../types/dashboard.types";
import { formatCurrency } from "../../../lib/format";
import { getPeriodSuffix } from "../../../utils/dashboardCalculations";
import { METRIC_COLORS } from "../../../constants/dashboard";

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
  } = params;

  const periodSuffix = getPeriodSuffix(timePeriod);
  const periodLabel = getPeriodLabel(timePeriod);

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
    },
  ];
}
