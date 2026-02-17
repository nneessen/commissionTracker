/**
 * Legacy Commission Types (v1)
 *
 * This file contains deprecated type definitions that are maintained
 * for backward compatibility. New code should NOT use these types.
 *
 * Migration Guide:
 * - Client → CommissionClientInfo (commission.types.ts)
 * - advanceAmount → amount
 * - paidDate → paymentDate
 * - created_at/updated_at → createdAt/updatedAt
 */

import type { Commission } from "../commission.types";

/**
 * @deprecated CommissionClientInfo was removed — client data belongs on Policy, not Commission.
 */
export interface LegacyClient {
  name: string;
  state?: string;
}

/**
 * Legacy Commission interface with deprecated field names
 * @deprecated Use Commission from commission.types.ts with new field names
 */
export interface LegacyCommission {
  id: string;
  policyId?: string;
  userId: string;
  client: LegacyClient;
  carrierId: string;

  // Legacy financial fields
  /** @deprecated Use 'amount' instead */
  advanceAmount?: number;

  // Legacy date fields
  /** @deprecated Use 'paymentDate' instead */
  paidDate?: Date;

  // Legacy timestamp fields (snake_case)
  /** @deprecated Use 'createdAt' instead */
  created_at?: Date;
  /** @deprecated Use 'updatedAt' instead */
  updated_at?: Date;
}

/**
 * Maps legacy Commission fields to current field names
 * Use this when migrating old data or API responses
 */
export function migrateLegacyCommission(
  legacy: Partial<LegacyCommission>,
): Partial<Commission> {
  const migrated: Partial<Commission> = { ...legacy } as Partial<Commission>;

  // Map advanceAmount → amount
  if ("advanceAmount" in legacy && legacy.advanceAmount !== undefined) {
    migrated.amount = legacy.advanceAmount;
  }

  // Map paidDate → paymentDate
  if ("paidDate" in legacy && legacy.paidDate !== undefined) {
    migrated.paymentDate = legacy.paidDate;
  }

  // Map created_at → createdAt
  if ("created_at" in legacy && legacy.created_at !== undefined) {
    migrated.createdAt = legacy.created_at;
  }

  // Map updated_at → updatedAt
  if ("updated_at" in legacy && legacy.updated_at !== undefined) {
    migrated.updatedAt = legacy.updated_at;
  }

  return migrated;
}

/**
 * Type guard to check if an object uses legacy field names
 */
export function hasLegacyFields(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    "advanceAmount" in record ||
    "paidDate" in record ||
    ("created_at" in record && !("createdAt" in record)) ||
    ("updated_at" in record && !("updatedAt" in record))
  );
}
