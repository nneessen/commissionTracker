// src/features/dashboard/config/statsConfig.ts

/**
 * Stats Configuration for QuickStatsPanel
 *
 * Generates the configuration array for stat items displayed in the left sidebar.
 * Previously inline in DashboardHome.tsx (lines 390-593).
 */

import { TimePeriod, getPeriodLabel } from '../../../utils/dateRange';
import { StatItemConfig } from '../../../types/dashboard.types';
import { METRIC_COLORS } from '../../../constants/dashboard';
import { formatCurrency, formatPercent } from '../../../utils/formatting';
import { scaleToDisplayPeriod, getPeriodSuffix } from '../../../utils/dashboardCalculations';

interface StatsConfigParams {
  timePeriod: TimePeriod;
  periodCommissions: {
    earned: number;
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
}

/**
 * Generate stats configuration for the QuickStatsPanel
 */
export function generateStatsConfig(params: StatsConfigParams): StatItemConfig[] {
  const {
    timePeriod,
    periodCommissions,
    periodExpenses,
    periodPolicies,
    periodClients,
    periodAnalytics,
    currentState,
    derivedMetrics,
    breakevenDisplay,
    policiesNeededDisplay,
  } = params;

  const periodSuffix = getPeriodSuffix(timePeriod);
  const periodLabel = getPeriodLabel(timePeriod);

  return [
    {
      label: `${periodLabel} Commission Earned`,
      value: formatCurrency(scaleToDisplayPeriod(periodCommissions.earned, timePeriod)),
      trend: periodAnalytics.surplusDeficit >= 0 ? 'up' : 'down',
      color: periodCommissions.earned > 0 ? METRIC_COLORS.COMMISSION_EARNED : METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: `${periodLabel} Commission Earned`,
        description: `Commission earned scaled to ${timePeriod.toLowerCase()} period.`,
        formula: `Monthly total ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
        example: `$5,000 monthly → ${timePeriod === 'weekly' ? '$1,154 weekly' : timePeriod === 'daily' ? '$164 daily' : timePeriod === 'yearly' ? '$60,000 yearly' : '$5,000 monthly'}`,
        note: `Scaled from monthly total to show ${timePeriod} breakdown`,
      },
    },
    {
      label: 'Pending Pipeline',
      value: formatCurrency(currentState.pendingPipeline),
      color: METRIC_COLORS.PENDING_PIPELINE,
      tooltip: {
        title: 'Pending Pipeline',
        description: 'Total value of ALL commissions awaiting payment (current state, not filtered by period).',
        formula: 'SUM(advance_amount) WHERE status=pending',
        example: 'Shows total amount you are currently owed',
        note: 'This is a point-in-time metric - does NOT change with time period',
      },
    },
    {
      label: `${periodLabel} Total Expenses`,
      value: formatCurrency(scaleToDisplayPeriod(periodExpenses.total, timePeriod)),
      color: METRIC_COLORS.EXPENSES,
      tooltip: {
        title: `${periodLabel} Total Expenses`,
        description: `Expenses scaled to ${timePeriod.toLowerCase()} period.`,
        formula: `Monthly total ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
        example: `$5,000 monthly → ${timePeriod === 'weekly' ? '$1,154 weekly' : timePeriod === 'daily' ? '$164 daily' : timePeriod === 'yearly' ? '$60,000 yearly' : '$5,000 monthly'}`,
        note: `Scaled from monthly total to show ${timePeriod} breakdown`,
      },
    },
    {
      label: `${periodLabel} Net Income`,
      value: formatCurrency(Math.abs(scaleToDisplayPeriod(periodAnalytics.surplusDeficit, timePeriod))),
      trend: periodAnalytics.surplusDeficit >= 0 ? 'up' : 'down',
      color: periodAnalytics.surplusDeficit >= 0 ? METRIC_COLORS.NET_INCOME_POSITIVE : METRIC_COLORS.NET_INCOME_NEGATIVE,
      tooltip: {
        title: `${periodLabel} Net Income`,
        description: `Net income scaled to ${timePeriod.toLowerCase()} period.`,
        formula: `(Commission - Expenses) ${timePeriod === 'weekly' ? '÷ 4.33' : timePeriod === 'daily' ? '÷ 30.44' : timePeriod === 'yearly' ? '× 12' : ''}`,
        example: `Net income scaled to show ${timePeriod} breakdown`,
        note: `Scaled from monthly total to show ${timePeriod} breakdown`,
      },
    },
    {
      label: 'Breakeven Needed' + periodSuffix,
      value: formatCurrency(Math.max(0, breakevenDisplay)),
      color: periodAnalytics.breakevenNeeded <= 0 ? METRIC_COLORS.BREAKEVEN_MET : METRIC_COLORS.BREAKEVEN,
      tooltip: {
        title: 'Breakeven Needed' + periodSuffix,
        description: `Additional commission needed ${timePeriod === 'daily' ? 'per day' : timePeriod === 'weekly' ? 'per week' : timePeriod === 'monthly' ? 'per month' : 'per year'} to cover expenses. Scales with timeframe to show per-period breakdown.`,
        formula: 'IF deficit: (Expenses - Commission) / Days, ELSE: 0',
        example: 'Need $1,000 monthly ÷ 30 days = $33.33 per day',
        note: 'Green ($0) means you are profitable. Scales with timeframe selection.',
      },
    },
    {
      label: 'Policies Needed' + periodSuffix,
      value: policiesNeededDisplay.toString(),
      color: METRIC_COLORS.POLICIES_NEEDED,
      tooltip: {
        title: 'Policies Needed' + periodSuffix,
        description: `Number of new policies to sell ${timePeriod === 'daily' ? 'today' : timePeriod === 'weekly' ? 'this week' : timePeriod === 'monthly' ? 'this month' : 'this year'} to reach breakeven. Changes with timeframe selection to show per-period breakdown.`,
        formula: 'Breakeven Needed / Avg Commission per Policy / Days in Period',
        example: 'Need 60 policies monthly ÷ 30 days = 2 policies per day',
        note: 'Scales with selected timeframe to make goals achievable',
      },
    },
    {
      label: 'Active Policies',
      value: currentState.activePolicies.toString(),
      color: METRIC_COLORS.ACTIVE_POLICIES,
      tooltip: {
        title: 'Active Policies',
        description: 'Total number of CURRENTLY active insurance policies (point-in-time).',
        formula: 'COUNT(policies) WHERE status=active',
        note: 'Does NOT change with time period - shows current state',
      },
    },
    {
      label: 'Total Policies',
      value: currentState.totalPolicies.toString(),
      color: METRIC_COLORS.TOTAL_POLICIES,
      tooltip: {
        title: 'Total Policies',
        description: 'Lifetime total of ALL policies ever written (active, lapsed, cancelled).',
        formula: 'COUNT(all policies)',
        note: 'Does NOT change with time period - shows lifetime total',
      },
    },
    {
      label: 'Retention Rate',
      value: formatPercent(currentState.retentionRate),
      color: currentState.retentionRate >= 80 ? METRIC_COLORS.RETENTION_GOOD : METRIC_COLORS.RETENTION_WARNING,
      tooltip: {
        title: 'Retention Rate',
        description: 'Percentage of policies that remain active vs total ever written.',
        formula: '(Active Policies / Total Policies) × 100',
        example: '80 active / 100 total = 80% retention',
        note: 'Above 80% is good, below 70% needs attention',
      },
    },
    {
      label: 'Lapse Rate',
      value: formatPercent(derivedMetrics.lapsedRate),
      color: derivedMetrics.lapsedRate < 10 ? METRIC_COLORS.LAPSE_GOOD : METRIC_COLORS.LAPSE_BAD,
      tooltip: {
        title: 'Lapse Rate',
        description: `Percentage of policies that lapsed in the ${timePeriod.toLowerCase()} period.`,
        formula: '(Lapsed Policies in Period / New Policies in Period) × 100',
        example: '2 lapsed / 20 new = 10% lapse rate',
        note: 'Below 10% is good, above 20% is concerning',
      },
    },
    {
      label: 'Total Clients',
      value: currentState.totalClients.toString(),
      color: METRIC_COLORS.TOTAL_CLIENTS,
      tooltip: {
        title: 'Total Clients',
        description: 'Lifetime total of unique clients across all policies.',
        formula: 'COUNT(DISTINCT clients)',
        note: 'Point-in-time metric - shows total client base',
      },
    },
    {
      label: 'Policies/Client',
      value: currentState.totalClients > 0
        ? (currentState.totalPolicies / currentState.totalClients).toFixed(2)
        : '0',
      color: METRIC_COLORS.POLICIES_PER_CLIENT,
      tooltip: {
        title: 'Policies per Client',
        description: 'Average number of policies per client (cross-sell metric).',
        formula: 'Total Policies / Total Clients',
        example: '150 policies / 100 clients = 1.5 policies/client',
        note: 'Higher is better - shows cross-sell success',
      },
    },
    {
      label: 'Avg Premium',
      value: formatCurrency(periodPolicies.averagePremium),
      color: METRIC_COLORS.AVG_PREMIUM,
      tooltip: {
        title: 'Average Premium',
        description: `Average annual premium of new policies written in ${timePeriod.toLowerCase()} period.`,
        formula: 'AVG(annual_premium) for policies in period',
        example: 'Total premiums $100,000 / 50 policies = $2,000 avg',
      },
    },
    {
      label: 'Avg Comm/Policy',
      value: formatCurrency(
        periodPolicies.newCount > 0
          ? periodCommissions.earned / periodPolicies.newCount
          : periodPolicies.averagePremium * periodCommissions.averageRate
      ),
      color: METRIC_COLORS.AVG_COMMISSION,
      tooltip: {
        title: 'Average Commission per Policy',
        description: `Average commission earned per policy in ${timePeriod.toLowerCase()} period.`,
        formula: 'Total Commission Earned / New Policies Written',
        example: '$10,000 commission / 50 policies = $200/policy',
      },
    },
    {
      label: 'Avg Client LTV',
      value: formatCurrency(derivedMetrics.avgClientValue),
      color: METRIC_COLORS.AVG_CLIENT_LTV,
      tooltip: {
        title: 'Average Client Lifetime Value',
        description: `Average total premium value per new client in ${timePeriod.toLowerCase()} period.`,
        formula: 'Total Premium Written / New Clients',
        example: '$100,000 premium / 25 new clients = $4,000 LTV',
        note: 'Higher LTV means more valuable clients',
      },
    },
  ];
}
