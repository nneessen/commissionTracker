// src/features/dashboard/components/index.ts

// New refactored components
export { DashboardHeader } from './DashboardHeader';
export { TimePeriodSwitcher } from './TimePeriodSwitcher';
export { StatItem } from './StatItem';
export { QuickStatsPanel } from './QuickStatsPanel';
export { PerformanceOverviewCard } from './PerformanceOverviewCard';
export { AlertsPanel } from './AlertsPanel';
export { QuickActionsPanel } from './QuickActionsPanel';
export { KPIGrid } from './KPIGrid';

// KPI Layout variants
export { KPIGridHeatmap } from './KPIGridHeatmap';
export { KPIGridNarrative } from './KPIGridNarrative';
export { KPIGridMatrix } from './KPIGridMatrix';
export { KPILayoutSwitcher } from './KPILayoutSwitcher';

// KPI Layout shared components
export { MiniSparkline } from './kpi-layouts/MiniSparkline';
export { CircularGauge } from './kpi-layouts/CircularGauge';
export { NarrativeInsight } from './kpi-layouts/NarrativeInsight';

// Legacy components (kept for backwards compatibility)
export { FinancialHealthCard } from './FinancialHealthCard';
export { PerformanceMetrics } from './PerformanceMetrics';
export { PaceTracker } from './PaceTracker';
export { ActivityFeed } from './ActivityFeed';
