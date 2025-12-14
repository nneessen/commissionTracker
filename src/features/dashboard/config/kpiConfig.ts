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

  // KPI Breakdown: Detailed metrics not shown elsewhere
  return [
    {
      category: 'Financial Details',
      kpis: [
        { label: 'Profit Margin', value: formatPercent(periodAnalytics.profitMargin) },
        { label: 'Recurring Expenses', value: formatCurrency(periodExpenses.recurring) },
        { label: 'One-Time Expenses', value: formatCurrency(periodExpenses.oneTime) },
        { label: 'Tax Deductible', value: formatCurrency(periodExpenses.taxDeductible) },
      ],
    },
    {
      category: 'Policy Health',
      kpis: [
        { label: 'Active Policies', value: currentState.activePolicies },
        { label: 'Retention Rate', value: formatPercent(currentState.retentionRate) },
        { label: 'Cancelled', value: periodPolicies.cancelled },
        { label: 'Lapsed', value: periodPolicies.lapsed },
        { label: 'Lapse Rate', value: formatPercent(derivedMetrics.lapsedRate) },
      ],
    },
    {
      category: 'Client Details',
      kpis: [
        { label: 'Total Clients', value: currentState.totalClients },
        { label: 'Policies/Client', value: currentState.totalClients > 0 ? (currentState.totalPolicies / currentState.totalClients).toFixed(2) : '0' },
        { label: 'Avg Client Value', value: formatCurrency(derivedMetrics.avgClientValue) },
      ],
    },
  ];
}
