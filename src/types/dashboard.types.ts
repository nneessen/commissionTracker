// src/types/dashboard.types.ts

/**
 * Dashboard Type Definitions
 *
 * TypeScript interfaces and types for dashboard components and data.
 */

import {TimePeriod} from '../utils/dateRange';

/**
 * Tooltip configuration for metric explanations
 */
export interface MetricTooltipConfig {
  title: string;
  description: string;
  formula?: string;
  example?: string;
  note?: string;
}

/**
 * Stat item configuration for QuickStatsPanel
 */
export interface StatItemConfig {
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  color: string;
  tooltip?: MetricTooltipConfig;
}

/**
 * Performance metric row for PerformanceOverviewCard table
 */
export interface PerformanceMetricRow {
  metric: string;
  current: number;
  target: number | null;
  unit: '$' | '%' | '#';
  showTarget: boolean;
}

/**
 * KPI section for DetailedKPIGrid
 */
export interface KPISection {
  category: string;
  kpis: Array<{
    label: string;
    value: string | number;
  }>;
}

/**
 * Alert configuration for AlertsPanel
 */
export interface AlertConfig {
  type: 'info' | 'warning' | 'danger' | 'error';
  title: string;
  message: string;
  condition: boolean; // Whether to show this alert
}

/**
 * Quick action button configuration
 */
export interface QuickAction {
  label: string;
  action: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
}

/**
 * Dashboard metrics from hooks
 */
export interface DashboardMetrics {
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
  currentState: {
    activePolicies: number;
    totalPolicies: number;
    totalClients: number;
    pendingPipeline: number;
    retentionRate: number;
  };
  periodAnalytics: {
    policiesNeeded: number;
    breakevenNeeded: number;
    surplusDeficit: number;
    netIncome: number;
    profitMargin: number;
    paceMetrics: {
      dailyTarget: number;
      weeklyTarget: number;
      monthlyTarget: number;
    };
  };
}

/**
 * Derived calculations from dashboard metrics
 */
export interface DerivedMetrics {
  lapsedRate: number;
  cancellationRate: number;
  avgClientValue: number;
}

/**
 * Month progress information
 */
export interface MonthProgressInfo {
  now: Date;
  startOfMonth: Date;
  daysInMonth: number;
  daysPassed: number;
  monthProgress: number;
}

/**
 * Dashboard header props
 */
export interface DashboardHeaderProps {
  monthProgress: MonthProgressInfo;
}

/**
 * Time period switcher props
 */
export interface TimePeriodSwitcherProps {
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

/**
 * Quick stats panel props
 */
export interface QuickStatsPanelProps {
  stats: StatItemConfig[];
  timePeriod: TimePeriod;
}

/**
 * Performance overview card props
 */
export interface PerformanceOverviewCardProps {
  metrics: PerformanceMetricRow[];
  isBreakeven: boolean;
  timePeriod: TimePeriod;
  surplusDeficit: number;
  breakevenDisplay: number;
  policiesNeeded: number;
  periodSuffix: string;
}

/**
 * Alerts panel props
 */
export interface AlertsPanelProps {
  alerts: AlertConfig[];
}

/**
 * Quick actions panel props
 */
export interface QuickActionsPanelProps {
  actions: QuickAction[];
  onActionClick: (action: string) => void;
  isCreating: boolean;
}

/**
 * Detailed KPI grid props
 */
export interface DetailedKPIGridProps {
  sections: KPISection[];
}

/**
 * Performance status type
 */
export type PerformanceStatus = 'hit' | 'good' | 'fair' | 'poor' | 'neutral';

/**
 * Color scheme type for metrics
 */
export type MetricColor = keyof typeof import('../constants/dashboard').METRIC_COLORS;

/**
 * KPI layout variant type
 */
export type KPILayout = 'heatmap' | 'narrative' | 'matrix';

/**
 * KPI layout switcher props
 */
export interface KPILayoutSwitcherProps {
  layout: KPILayout;
  onLayoutChange: (layout: KPILayout) => void;
}
