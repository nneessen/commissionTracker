// src/constants/status.constants.ts
// Centralized status constants matching database enums

// =============================================================================
// COMMISSION STATUS (from database enum: commission_status)
// =============================================================================

export const COMMISSION_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  REVERSED: "reversed",
  DISPUTED: "disputed",
  CLAWBACK: "clawback",
  CHARGED_BACK: "charged_back",
} as const;

export type CommissionStatusValue =
  (typeof COMMISSION_STATUS)[keyof typeof COMMISSION_STATUS];

export const COMMISSION_STATUS_CONFIG: Record<
  CommissionStatusValue,
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "amber" },
  paid: { label: "Paid", color: "emerald" },
  reversed: { label: "Reversed", color: "orange" },
  disputed: { label: "Disputed", color: "yellow" },
  clawback: { label: "Clawback", color: "red" },
  charged_back: { label: "Charged Back", color: "red" },
};

// =============================================================================
// POLICY STATUS (from database enum: policy_status)
// =============================================================================

export const POLICY_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  LAPSED: "lapsed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type PolicyStatusValue =
  (typeof POLICY_STATUS)[keyof typeof POLICY_STATUS];

export const POLICY_STATUS_CONFIG: Record<
  PolicyStatusValue,
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "amber" },
  active: { label: "Active", color: "emerald" },
  lapsed: { label: "Lapsed", color: "red" },
  cancelled: { label: "Cancelled", color: "zinc" },
  expired: { label: "Expired", color: "blue" },
};

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

/**
 * Maps policy status to the expected commission status
 * When policy changes, commission should follow this mapping
 */
export const POLICY_TO_COMMISSION_STATUS: Record<
  PolicyStatusValue,
  CommissionStatusValue
> = {
  pending: "pending",
  active: "paid",
  lapsed: "charged_back",
  cancelled: "charged_back",
  expired: "paid", // Expired policies have already been paid out
};
