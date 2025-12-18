// src/features/dashboard/config/metricsConfig.ts

/**
 * Metrics Configuration for PerformanceOverviewCard
 *
 * Generates the configuration array for performance metrics table.
 * Previously inline in DashboardHome.tsx (lines 778-835).
 */

import { TimePeriod, getPeriodLabel } from "../../../utils/dateRange";
import { PerformanceMetricRow } from "../../../types/dashboard.types";
import type { DashboardFeatures } from "../../../hooks/dashboard";

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
  /** Dashboard feature access for gating */
  features?: DashboardFeatures;
}

/**
 * Generate performance metrics configuration for the table
 */
export function generateMetricsConfig(
  params: MetricsConfigParams,
): PerformanceMetricRow[] {
  const {
    timePeriod,
    periodCommissions,
    periodPolicies,
    periodClients,
    constants,
    features,
  } = params;

  const periodLabel = getPeriodLabel(timePeriod);

  // Check if user can view targets (Starter+ required)
  const canViewTargets = features?.canViewBasicTargets ?? true;

  // Performance Overview: Production metrics (no financial duplicates - those are in Key Metrics)
  return [
    {
      metric: `${periodLabel} Policies`,
      current: periodPolicies.newCount,
      target: null,
      unit: "#",
      showTarget: false,
    },
    {
      metric: `${periodLabel} Premium Written`,
      current: periodPolicies.premiumWritten,
      target: null,
      unit: "$",
      showTarget: false,
    },
    {
      metric: `${periodLabel} Clients`,
      current: periodClients.newCount,
      target: null,
      unit: "#",
      showTarget: false,
    },
    {
      metric: "Avg Premium",
      current: periodPolicies.averagePremium,
      target: constants?.avgAP || null,
      unit: "$",
      // Only show target if user has targets feature AND a target is set
      showTarget: canViewTargets && !!constants?.avgAP,
    },
    {
      metric: "Commission Rate",
      current: periodCommissions.averageRate,
      target: null,
      unit: "%",
      showTarget: false,
    },
  ];
}
