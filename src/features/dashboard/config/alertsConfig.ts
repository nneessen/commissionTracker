// src/features/dashboard/config/alertsConfig.ts

/**
 * Alerts Configuration for AlertsPanel
 *
 * Generates alert configurations based on dashboard state.
 * Extracted from DashboardHome.tsx (lines 963-1147).
 */

import { AlertConfig } from '../../../types/dashboard.types';
import { TimePeriod, getPeriodLabel } from '../../../utils/dateRange';
import { formatPercent, formatCurrency } from '../../../utils/formatting';

interface AlertsConfigParams {
  timePeriod: TimePeriod;
  periodCommissions: { earned: number };
  periodPolicies: { newCount: number; lapsed: number };
  periodExpenses: { total: number };
  periodAnalytics: { surplusDeficit: number };
  currentState: { activePolicies: number };
  lapsedRate: number;
  policiesNeeded: number;
  periodSuffix: string;
}

/**
 * Generate alerts configuration based on current dashboard state
 */
export function generateAlertsConfig(params: AlertsConfigParams): AlertConfig[] {
  const {
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodExpenses,
    periodAnalytics,
    currentState,
    lapsedRate,
    policiesNeeded,
    periodSuffix,
  } = params;

  const periodLabel = getPeriodLabel(timePeriod);
  const isBreakeven = periodAnalytics.surplusDeficit >= 0;

  return [
    {
      type: 'warning',
      title: `No Commissions ${periodLabel}`,
      message: `No commission earned in this ${timePeriod.toLowerCase()} period`,
      condition: periodCommissions.earned === 0,
    },
    {
      type: 'danger',
      title: `Below Breakeven (${periodLabel})`,
      message: `Need ${Math.ceil(policiesNeeded)} policies${periodSuffix.toLowerCase()} to break even`,
      condition: !isBreakeven,
    },
    {
      type: 'warning',
      title: `No New Policies ${periodLabel}`,
      message: `No policies written in this ${timePeriod.toLowerCase()} period`,
      condition: periodPolicies.newCount === 0,
    },
    {
      type: 'error',
      title: `High Lapse Rate (${periodLabel})`,
      message: `${formatPercent(lapsedRate)} of ${timePeriod.toLowerCase()} policies lapsed`,
      condition: lapsedRate > 10 && periodPolicies.newCount > 0,
    },
    {
      type: 'info',
      title: 'Get Started',
      message: 'Add your first policy',
      condition: currentState.activePolicies === 0,
    },
    {
      type: 'danger',
      title: 'Expenses Exceed Income',
      message: `${periodLabel} deficit: ${formatCurrency(Math.abs(periodAnalytics.surplusDeficit))}`,
      condition: periodExpenses.total > periodCommissions.earned && periodCommissions.earned > 0,
    },
  ];
}
