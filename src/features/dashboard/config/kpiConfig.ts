// src/features/dashboard/config/kpiConfig.ts

/**
 * KPI Configuration for DetailedKPIGrid
 *
 * Generates the configuration array for detailed KPI breakdown sections.
 * Previously inline in DashboardHome.tsx (lines 1246-1414).
 */

import { TimePeriod, getPeriodLabel } from '../../../utils/dateRange';
import { KPISection } from '../../../types/dashboard.types';
import { formatCurrency, formatPercent } from '../../../lib/format';
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
          label: 'Profit Margin',
          value: formatPercent(periodAnalytics.profitMargin),
        },
        {
          label: 'Recurring Expenses',
          value: formatCurrency(periodExpenses.recurring),
        },
        {
          label: 'One-Time Expenses',
          value: formatCurrency(periodExpenses.oneTime),
        },
        {
          label: 'Tax Deductible ⓘ',
          value: formatCurrency(periodExpenses.taxDeductible),
        },
      ],
    },
    {
      category: `${periodLabel} Production`,
      kpis: [
        {
          label: 'Cancelled',
          value: periodPolicies.cancelled,
        },
        {
          label: 'Lapsed',
          value: periodPolicies.lapsed,
        },
        {
          label: 'Commissionable Value',
          value: formatCurrency(periodPolicies.commissionableValue),
        },
      ],
    },
    {
      category: `${periodLabel} Metrics`,
      kpis: [
        {
          label: 'Cancel Rate',
          value: formatPercent(derivedMetrics.cancellationRate),
        },
        {
          label: 'Commission Count',
          value: periodCommissions.count,
        },
        {
          label: 'Avg Commission',
          value: formatCurrency(periodCommissions.averageAmount),
        },
        {
          label: 'Expense Count',
          value: periodExpenses.count,
        },
      ],
    },
    {
      category: `${periodLabel} Clients`,
      kpis: [
        {
          label: 'Avg Client Age',
          value: periodClients.averageAge > 0 ? periodClients.averageAge.toFixed(1) : '—',
        },
        {
          label: 'Total Value',
          value: formatCurrency(periodClients.totalValue),
        },
      ],
    },
    {
      category: 'Targets & Pace',
      kpis: [
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
