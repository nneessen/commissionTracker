// src/hooks/targets/useActualMetrics.ts

import { useMetricsWithDateRange } from '../kpi/useMetricsWithDateRange';
import type { ActualMetrics } from '../../types/targets.types';

/**
 * Fetch actual metrics for targets comparison
 * Returns YTD, QTD, and MTD values for income, policies, and expenses
 */
export const useActualMetrics = (): ActualMetrics => {
  // Fetch metrics for each time period
  const ytdMetrics = useMetricsWithDateRange({ timePeriod: 'yearly' });
  const qtdMetrics = useMetricsWithDateRange({ timePeriod: 'monthly', periodOffset: 0 }); // Quarterly not supported, using monthly
  const mtdMetrics = useMetricsWithDateRange({ timePeriod: 'monthly' });

  // Extract actual values
  return {
    // Income (commission earned)
    ytdIncome: ytdMetrics.periodCommissions.earned,
    qtdIncome: qtdMetrics.periodCommissions.earned,
    mtdIncome: mtdMetrics.periodCommissions.earned,

    // Policies
    ytdPolicies: ytdMetrics.periodPolicies.newCount,
    mtdPolicies: mtdMetrics.periodPolicies.newCount,

    // Average premium (from current state)
    currentAvgPremium: ytdMetrics.periodPolicies.averagePremium,

    // Persistency (will need to calculate separately - for now using retention rate as proxy)
    persistency13Month: ytdMetrics.currentState.retentionRate / 100,
    persistency25Month: ytdMetrics.currentState.retentionRate / 100,

    // Expenses
    mtdExpenses: mtdMetrics.periodExpenses.total,
    currentExpenseRatio: ytdMetrics.periodCommissions.earned > 0
      ? ytdMetrics.periodExpenses.total / ytdMetrics.periodCommissions.earned
      : 0,
  };
};
