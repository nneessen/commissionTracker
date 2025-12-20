// src/constants/dashboard.ts

/**
 * Dashboard metric color constants
 *
 * DESIGN PRINCIPLE: Use default foreground for most values.
 * Only use semantic colors for actual status indicators (positive/negative, good/bad).
 * This matches the clean styling of Targets/Expenses pages.
 */
export const METRIC_COLORS = {
  // Most metrics use default foreground - clean and professional
  COMMISSION_EARNED: "text-foreground",
  PENDING_PIPELINE: "text-foreground",
  EXPENSES: "text-foreground",
  ACTIVE_POLICIES: "text-foreground",
  TOTAL_POLICIES: "text-foreground",
  TOTAL_CLIENTS: "text-foreground",
  POLICIES_PER_CLIENT: "text-foreground",
  AVG_PREMIUM: "text-foreground",
  AVG_COMMISSION: "text-foreground",
  AVG_CLIENT_LTV: "text-foreground",
  POLICIES_NEEDED: "text-foreground",

  // Only use semantic colors for actual status indicators
  NET_INCOME_POSITIVE: "text-success",
  NET_INCOME_NEGATIVE: "text-error",
  BREAKEVEN: "text-warning",
  BREAKEVEN_MET: "text-success",
  RETENTION_GOOD: "text-success",
  RETENTION_WARNING: "text-warning",
  LAPSE_GOOD: "text-success",
  LAPSE_BAD: "text-error",
  CHARGEBACK: "text-error", // Chargebacks are always negative - use error color
} as const;
