// src/features/dashboard/config/kpiConfig.ts

/**
 * KPI Configuration for DetailedKPIGrid
 *
 * Generates the configuration array for detailed KPI breakdown sections.
 * Previously inline in DashboardHome.tsx (lines 1246-1414).
 */

import { TimePeriod, getPeriodLabel } from '../../../utils/dateRange';
import { KPISection } from '../../../types/dashboard.types';
import { formatCurrency, formatPercent } from '../../../utils/formatting';
import { scaleToDisplayPeriod, scaleCountToDisplayPeriod, getPeriodSuffix } from '../../../utils/dashboardCalculations';

interface KPIConfigParams {
  timePeriod: TimePeriod;
  periodCommissions: {
    earned: number;
    count: number;
    averageAmount: number;
    averageRate: number;
  };
  periodExpenses: {
    total: number;
    count: number;
    recurring: number;
    oneTime: number;
    taxDeductible: number;
  };
  periodPolicies: {
    newCount: number;
    cancelled: number;
    lapsed: number;
    premiumWritten: number;
    averagePremium: number;
    commissionableValue: number;
  };
  periodClients: {
    newCount: number;
    totalValue: number;
    averageAge: number;
  };
  periodAnalytics: {
    netIncome: number;
    profitMargin: number;
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
    cancellationRate: number;
    avgClientValue: number;
  };
  breakevenDisplay: number;
  policiesNeededDisplay: number;
}

/**
 * Generate KPI sections configuration for the DetailedKPIGrid
 */
export function generateKPIConfig(params: KPIConfigParams): KPISection[] {
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

  const periodLabel = getPeriodLabel(timePeriod);
  const periodSuffix = getPeriodSuffix(timePeriod);

  return [
    {
      category: `${periodLabel} Financial`,
      kpis: [
        {
          label: 'Commission Earned',
          value: formatCurrency(scaleToDisplayPeriod(periodCommissions.earned, timePeriod)),
        },
        {
          label: 'Total Expenses',
          value: formatCurrency(scaleToDisplayPeriod(periodExpenses.total, timePeriod)),
        },
        {
          label: 'Net Income',
          value: formatCurrency(scaleToDisplayPeriod(periodAnalytics.netIncome, timePeriod)),
        },
        {
          label: 'Profit Margin',
          value: formatPercent(periodAnalytics.profitMargin),
        },
        {
          label: 'Recurring Expenses',
          value: formatCurrency(scaleToDisplayPeriod(periodExpenses.recurring, timePeriod)),
        },
        {
          label: 'One-Time Expenses',
          value: formatCurrency(scaleToDisplayPeriod(periodExpenses.oneTime, timePeriod)),
        },
        {
          label: 'Tax Deductible ⓘ',
          value: formatCurrency(scaleToDisplayPeriod(periodExpenses.taxDeductible, timePeriod)),
        },
      ],
    },
    {
      category: `${periodLabel} Production`,
      kpis: [
        {
          label: 'New Policies',
          value: scaleCountToDisplayPeriod(periodPolicies.newCount, timePeriod),
        },
        {
          label: 'Premium Written',
          value: formatCurrency(scaleToDisplayPeriod(periodPolicies.premiumWritten, timePeriod)),
        },
        {
          label: 'Avg Premium/Policy',
          value: formatCurrency(periodPolicies.averagePremium),
        },
        {
          label: 'Cancelled',
          value: scaleCountToDisplayPeriod(periodPolicies.cancelled, timePeriod),
        },
        {
          label: 'Lapsed',
          value: scaleCountToDisplayPeriod(periodPolicies.lapsed, timePeriod),
        },
        {
          label: 'Commissionable Value',
          value: formatCurrency(scaleToDisplayPeriod(periodPolicies.commissionableValue, timePeriod)),
        },
      ],
    },
    {
      category: `${periodLabel} Metrics`,
      kpis: [
        {
          label: 'Lapse Rate',
          value: formatPercent(derivedMetrics.lapsedRate),
        },
        {
          label: 'Cancel Rate',
          value: formatPercent(derivedMetrics.cancellationRate),
        },
        {
          label: 'Commission Count',
          value: scaleCountToDisplayPeriod(periodCommissions.count, timePeriod),
        },
        {
          label: 'Avg Commission',
          value: formatCurrency(periodCommissions.averageAmount),
        },
        {
          label: 'Avg Comm Rate',
          value: formatPercent(periodCommissions.averageRate),
        },
        {
          label: 'Expense Count',
          value: scaleCountToDisplayPeriod(periodExpenses.count, timePeriod),
        },
      ],
    },
    {
      category: `${periodLabel} Clients`,
      kpis: [
        {
          label: 'New Clients',
          value: scaleCountToDisplayPeriod(periodClients.newCount, timePeriod),
        },
        {
          label: 'Avg Client Age',
          value: periodClients.averageAge > 0 ? periodClients.averageAge.toFixed(1) : '—',
        },
        {
          label: 'Total Value',
          value: formatCurrency(scaleToDisplayPeriod(periodClients.totalValue, timePeriod)),
        },
        {
          label: 'Avg Value/Client',
          value: formatCurrency(derivedMetrics.avgClientValue),
        },
      ],
    },
    {
      category: 'Current Status',
      kpis: [
        {
          label: 'Active Policies',
          value: currentState.activePolicies,
        },
        {
          label: 'Total Policies',
          value: currentState.totalPolicies,
        },
        {
          label: 'Total Clients',
          value: currentState.totalClients,
        },
        {
          label: 'Pending Pipeline',
          value: formatCurrency(currentState.pendingPipeline),
        },
        {
          label: 'Retention Rate',
          value: formatPercent(currentState.retentionRate),
        },
      ],
    },
    {
      category: 'Targets & Pace',
      kpis: [
        {
          label: 'Breakeven Needed' + periodSuffix,
          value: formatCurrency(Math.max(0, breakevenDisplay)),
        },
        {
          label: 'Policies Needed' + periodSuffix,
          value: Math.ceil(policiesNeededDisplay),
        },
        {
          label: 'Daily Target',
          value: periodAnalytics.paceMetrics.dailyTarget,
        },
        {
          label: 'Weekly Target',
          value: periodAnalytics.paceMetrics.weeklyTarget,
        },
        {
          label: 'Monthly Target',
          value: periodAnalytics.paceMetrics.monthlyTarget,
        },
      ],
    },
  ];
}
