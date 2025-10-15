// src/features/dashboard/config/metricsConfig.ts

/**
 * Metrics Configuration for PerformanceOverviewCard
 *
 * Generates the configuration array for performance metrics table.
 * Previously inline in DashboardHome.tsx (lines 778-835).
 */

import { TimePeriod, getPeriodLabel } from '../../../utils/dateRange';
import { PerformanceMetricRow } from '../../../types/dashboard.types';
import { scaleToDisplayPeriod, scaleCountToDisplayPeriod } from '../../../utils/dashboardCalculations';

interface MetricsConfigParams {
  timePeriod: TimePeriod;
  periodCommissions: {
    earned: number;
    averageRate: number;
  };
  periodPolicies: {
    newCount: number;
    premiumWritten: number;
    averagePremium: number;
  };
  periodClients: {
    newCount: number;
  };
  periodExpenses: {
    total: number;
  };
  periodAnalytics: {
    netIncome: number;
  };
  constants?: {
    avgAP?: number;
  };
}

/**
 * Generate performance metrics configuration for the table
 */
export function generateMetricsConfig(params: MetricsConfigParams): PerformanceMetricRow[] {
  const {
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodClients,
    periodExpenses,
    periodAnalytics,
    constants,
  } = params;

  const periodLabel = getPeriodLabel(timePeriod);

  return [
    {
      metric: `${periodLabel} Commission Earned`,
      current: periodCommissions.earned,
      target: null,
      unit: '$',
      showTarget: false,
    },
    {
      metric: `${periodLabel} New Policies`,
      current: periodPolicies.newCount,
      target: null,
      unit: '#',
      showTarget: false,
    },
    {
      metric: `${periodLabel} Premium Written`,
      current: periodPolicies.premiumWritten,
      target: null,
      unit: '$',
      showTarget: false,
    },
    {
      metric: `${periodLabel} New Clients`,
      current: periodClients.newCount,
      target: null,
      unit: '#',
      showTarget: false,
    },
    {
      metric: 'Avg Premium per Policy',
      current: periodPolicies.averagePremium,
      target: constants?.avgAP || null,
      unit: '$',
      showTarget: !!constants?.avgAP,
    },
    {
      metric: 'Avg Commission Rate',
      current: periodCommissions.averageRate,
      target: null,
      unit: '%',
      showTarget: false,
    },
    {
      metric: `${periodLabel} Total Expenses`,
      current: periodExpenses.total,
      target: null,
      unit: '$',
      showTarget: false,
    },
    {
      metric: `${periodLabel} Net Income`,
      current: periodAnalytics.netIncome,
      target: null,
      unit: '$',
      showTarget: false,
    },
  ];
}
