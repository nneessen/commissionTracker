// src/constants/dashboard.ts

/**
 * Dashboard metric color constants
 * Now uses semantic Tailwind classes that adapt to light/dark mode
 */
export const METRIC_COLORS = {
  COMMISSION_EARNED: "text-status-active",
  PENDING_PIPELINE: "text-status-earned",
  EXPENSES: "text-status-pending",
  NET_INCOME_POSITIVE: "text-status-active",
  NET_INCOME_NEGATIVE: "text-destructive",
  BREAKEVEN: "text-destructive",
  BREAKEVEN_MET: "text-status-active",
  POLICIES_NEEDED: "text-primary",
  ACTIVE_POLICIES: "text-status-earned",
  TOTAL_POLICIES: "text-muted-foreground",
  RETENTION_GOOD: "text-status-active",
  RETENTION_WARNING: "text-status-pending",
  LAPSE_GOOD: "text-status-active",
  LAPSE_BAD: "text-destructive",
  TOTAL_CLIENTS: "text-primary",
  POLICIES_PER_CLIENT: "text-primary",
  AVG_PREMIUM: "text-status-earned",
  AVG_COMMISSION: "text-status-active",
  AVG_CLIENT_LTV: "text-status-pending",
} as const;
