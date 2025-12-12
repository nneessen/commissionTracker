// src/constants/dashboard.ts

/**
 * Dashboard metric color constants
 */
// TODO: why are we styling the dashboard this way? These are not the colors that we should be using in this application
// We already have a index.css with my color scheme so we should not be doing the dashboard using any of these colors
export const METRIC_COLORS = {
  COMMISSION_EARNED: "rgb(16, 185, 129)",
  PENDING_PIPELINE: "rgb(59, 130, 246)",
  EXPENSES: "rgb(245, 158, 11)",
  NET_INCOME_POSITIVE: "rgb(16, 185, 129)",
  NET_INCOME_NEGATIVE: "rgb(239, 68, 68)",
  BREAKEVEN: "rgb(239, 68, 68)",
  BREAKEVEN_MET: "rgb(16, 185, 129)",
  POLICIES_NEEDED: "rgb(139, 92, 246)",
  ACTIVE_POLICIES: "rgb(6, 182, 212)",
  TOTAL_POLICIES: "rgb(100, 116, 139)",
  RETENTION_GOOD: "rgb(16, 185, 129)",
  RETENTION_WARNING: "rgb(245, 158, 11)",
  LAPSE_GOOD: "rgb(16, 185, 129)",
  LAPSE_BAD: "rgb(239, 68, 68)",
  TOTAL_CLIENTS: "rgb(236, 72, 153)",
  POLICIES_PER_CLIENT: "rgb(168, 85, 247)",
  AVG_PREMIUM: "rgb(14, 165, 233)",
  AVG_COMMISSION: "rgb(20, 184, 166)",
  AVG_CLIENT_LTV: "rgb(249, 115, 22)",
} as const;

export type MetricColorKey = keyof typeof METRIC_COLORS;

