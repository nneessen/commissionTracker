// src/lib/temporaryAccess.ts
// Temporary free access period configuration
// This file controls the temporary "all features free" period until end of January 2026

import type { FeatureKey } from "@/hooks/subscription/useFeatureAccess";

/**
 * End date for temporary free access period.
 * After this date, normal subscription gating resumes.
 */
const TEMPORARY_ACCESS_END_DATE = new Date("2026-02-01T00:00:00Z");

/**
 * Features that are EXCLUDED from temporary free access.
 * These features will still require proper subscription even during the free period.
 */
const EXCLUDED_FEATURES: FeatureKey[] = ["recruiting"];

/**
 * Admin email that bypasses ALL restrictions including the recruiting preview banner.
 */
export const SUPER_ADMIN_EMAIL = "nickneessen@thestandardhq.com";

/**
 * Emails with permanent Instagram access (for Meta App Review).
 * These accounts bypass subscription checks indefinitely.
 */
const PERMANENT_INSTAGRAM_ACCESS_EMAILS = ["meta-reviewer@thestandardhq.com"];

/**
 * Check if we are currently in the temporary free access period.
 * Returns true until Feb 1, 2026 00:00 UTC.
 */
export function isTemporaryFreeAccessPeriod(): boolean {
  return new Date() < TEMPORARY_ACCESS_END_DATE;
}

/**
 * Check if a feature should be granted free access during the temporary period.
 * Recruiting and any other excluded features will NOT be granted free access.
 */
export function shouldGrantTemporaryAccess(feature: FeatureKey): boolean {
  if (!isTemporaryFreeAccessPeriod()) {
    return false;
  }

  // Excluded features don't get temporary access
  if (EXCLUDED_FEATURES.includes(feature)) {
    return false;
  }

  return true;
}

/**
 * Check if a user email is the super admin.
 */
export function isSuperAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if an email has permanent Instagram access (for Meta App Review).
 */
export function hasPermanentInstagramAccess(
  email: string | undefined | null,
): boolean {
  if (!email) return false;
  return PERMANENT_INSTAGRAM_ACCESS_EMAILS.includes(email.toLowerCase());
}

/**
 * Get the days remaining in the temporary free access period.
 * Returns 0 if the period has ended.
 */
export function getTemporaryAccessDaysRemaining(): number {
  const now = new Date();
  if (now >= TEMPORARY_ACCESS_END_DATE) return 0;

  const diff = TEMPORARY_ACCESS_END_DATE.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
