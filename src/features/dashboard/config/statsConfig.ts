// src/features/dashboard/config/statsConfig.ts

import { TimePeriod, getPeriodLabel } from "../../../utils/dateRange";
import { StatItemConfig } from "../../../types/dashboard.types";
import { formatCurrency, formatPercent } from "../../../lib/format";
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
    periodPolicies,
    periodAnalytics,
    currentState,
    derivedMetrics,
    breakevenDisplay,
    policiesNeededDisplay,
    chargebackSummary,
  } = params;

  const periodSuffix = getPeriodSuffix(timePeriod);
  const periodLabel = getPeriodLabel(timePeriod);

  return [
    {
      label: `${periodLabel} Commission Paid`,
      value: formatCurrency(periodCommissions.paid),
      trend: periodAnalytics.surplusDeficit >= 0 ? "up" : "down",
      color:
        periodCommissions.paid > 0
          ? METRIC_COLORS.COMMISSION_EARNED
          : METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: `${periodLabel} Commission Paid`,
        description: `Commission payments actually received in your account during the ${timePeriod.toLowerCase()} period.`,
        formula: `Sum of commission amounts where status='paid' and payment date in period`,
        note: `Actual cash received, not just entitled`,
      },
    },
    {
      label: "Pending Pipeline",
      value: formatCurrency(currentState.pendingPipeline),
      color: METRIC_COLORS.PENDING_PIPELINE,
      tooltip: {
        title: "Pending Pipeline",
        description: "Total commissions owed to you but not yet paid.",
        formula: "Sum of all commissions where status is pending or earned",
        note: "Point-in-time metric - does NOT change with time period filter",
      },
    },
    {
      label: `${periodLabel} Total Expenses`,
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
      label: "Breakeven Needed" + periodSuffix,
      value: formatCurrency(Math.max(0, breakevenDisplay)),
      color:
        periodAnalytics.breakevenNeeded <= 0
          ? METRIC_COLORS.BREAKEVEN_MET
          : METRIC_COLORS.BREAKEVEN,
      tooltip: {
        title: "Breakeven Needed" + periodSuffix,
        description: `Commission needed ${timePeriod === "daily" ? "per day" : timePeriod === "weekly" ? "per week" : timePeriod === "monthly" ? "per month" : "per year"} to cover expenses.`,
        formula: "IF deficit: (Expenses - Commission) / Days, ELSE: 0",
        note: "Green ($0) means you are profitable",
      },
    },
    {
      label: "Policies Needed" + periodSuffix,
      value: policiesNeededDisplay.toString(),
      color: METRIC_COLORS.POLICIES_NEEDED,
      tooltip: {
        title: "Policies Needed" + periodSuffix,
        description: `Policies to sell ${timePeriod === "daily" ? "today" : timePeriod === "weekly" ? "this week" : timePeriod === "monthly" ? "this month" : "this year"} to reach breakeven.`,
        formula:
          "Breakeven Needed / Avg Commission per Policy / Days in Period",
        note: "Scales with selected timeframe",
      },
    },
    {
      label: "Active Policies",
      value: currentState.activePolicies.toString(),
      color: METRIC_COLORS.ACTIVE_POLICIES,
      tooltip: {
        title: "Active Policies",
        description: "Currently active insurance policies.",
        formula: "COUNT(policies) WHERE status=active",
        note: "Point-in-time metric - does NOT change with time period",
      },
    },
    {
      label: "Total Policies",
      value: currentState.totalPolicies.toString(),
      color: METRIC_COLORS.TOTAL_POLICIES,
      tooltip: {
        title: "Total Policies",
        description: "Lifetime total of all policies ever written.",
        formula: "COUNT(all policies)",
        note: "Point-in-time metric - does NOT change with time period",
      },
    },
    {
      label: "Retention Rate",
      value: formatPercent(currentState.retentionRate),
      color:
        currentState.retentionRate >= 80
          ? METRIC_COLORS.RETENTION_GOOD
          : METRIC_COLORS.RETENTION_WARNING,
      tooltip: {
        title: "Retention Rate",
        description: "Percentage of policies that remain active.",
        formula: "(Active Policies / Total Policies) × 100",
        note: "Above 80% is good, below 70% needs attention",
      },
    },
    {
      label: "Lapse Rate",
      value: formatPercent(derivedMetrics.lapsedRate),
      color:
        derivedMetrics.lapsedRate < 10
          ? METRIC_COLORS.LAPSE_GOOD
          : METRIC_COLORS.LAPSE_BAD,
      tooltip: {
        title: "Lapse Rate",
        description: `Percentage of policies that lapsed in the ${timePeriod.toLowerCase()} period.`,
        formula: "(Lapsed Policies in Period / New Policies in Period) × 100",
        note: "Below 10% is good, above 20% is concerning",
      },
    },
    {
      label: "Total Chargebacks",
      value: formatCurrency(chargebackSummary?.totalChargebackAmount || 0),
      color: METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: "Total Chargebacks",
        description:
          "Total charged back when policies cancel or lapse before advance is earned.",
        formula: "SUM(chargeback_amount) for all commissions",
        note: "Lower is better - chargebacks reduce actual earnings",
      },
    },
    {
      label: "Chargeback Rate",
      value: formatPercent(chargebackSummary?.chargebackRatePercentage || 0),
      color:
        !chargebackSummary || chargebackSummary.chargebackRatePercentage < 5
          ? METRIC_COLORS.LAPSE_GOOD
          : chargebackSummary.chargebackRatePercentage < 10
            ? METRIC_COLORS.RETENTION_WARNING
            : METRIC_COLORS.LAPSE_BAD,
      tooltip: {
        title: "Chargeback Rate",
        description:
          "Percentage of advances charged back due to cancellations or lapses.",
        formula: "(Total Chargebacks / Total Advances) × 100",
        note: "Good: <5% | Warning: 5-10% | Danger: >10%",
      },
    },
    {
      label: "At Risk Amount",
      value: formatCurrency(chargebackSummary?.atRiskAmount || 0),
      color: METRIC_COLORS.EXPENSES,
      tooltip: {
        title: "At Risk Amount",
        description:
          "Unearned commissions at risk of chargeback (policies with low months paid).",
        formula:
          "SUM(unearned_amount) for commissions with status=pending/earned and months_paid < advance_months",
        note: "Monitor to reduce future chargebacks",
      },
    },
    {
      label: "High Risk Count",
      value: (chargebackSummary?.highRiskCount || 0).toString(),
      color: METRIC_COLORS.EXPENSES,
      tooltip: {
        title: "High Risk Count",
        description: "Policies with <3 months paid (high chargeback risk).",
        formula:
          "COUNT(commissions) WHERE months_paid < 3 AND status IN (pending, earned)",
        note: "Contact these clients to prevent lapses",
      },
    },
    {
      label: "Total Clients",
      value: currentState.totalClients.toString(),
      color: METRIC_COLORS.TOTAL_CLIENTS,
      tooltip: {
        title: "Total Clients",
        description: "Lifetime total of unique clients.",
        formula: "COUNT(DISTINCT clients)",
        note: "Point-in-time metric - does NOT change with time period",
      },
    },
    {
      label: "Policies/Client",
      value:
        currentState.totalClients > 0
          ? (currentState.totalPolicies / currentState.totalClients).toFixed(2)
          : "0",
      color: METRIC_COLORS.POLICIES_PER_CLIENT,
      tooltip: {
        title: "Policies per Client",
        description: "Average policies per client (cross-sell metric).",
        formula: "Total Policies / Total Clients",
        note: "Higher is better - shows cross-sell success",
      },
    },
    {
      label: "Avg Premium",
      value: formatCurrency(periodPolicies.averagePremium),
      color: METRIC_COLORS.AVG_PREMIUM,
      tooltip: {
        title: "Average Premium",
        description: `Average annual premium of new policies in ${timePeriod.toLowerCase()} period.`,
        formula: "AVG(annual_premium) for policies in period",
      },
    },
    {
      label: "Avg Comm/Policy",
      value: formatCurrency(
        periodPolicies.newCount > 0
          ? periodCommissions.earned / periodPolicies.newCount
          : periodPolicies.averagePremium *
              (periodCommissions.averageRate / 100),
      ),
      color: METRIC_COLORS.AVG_COMMISSION,
      tooltip: {
        title: "Average Commission per Policy",
        description: `Average commission per policy in ${timePeriod.toLowerCase()} period.`,
        formula: "Total Commission Earned / New Policies Written",
      },
    },
    {
      label: "Avg Client LTV",
      value: formatCurrency(derivedMetrics.avgClientValue),
      color: METRIC_COLORS.AVG_CLIENT_LTV,
      tooltip: {
        title: "Average Client Lifetime Value",
        description: `Average premium value per new client in ${timePeriod.toLowerCase()} period.`,
        formula: "Total Premium Written / New Clients",
        note: "Higher is better",
      },
    },
  ];
}
