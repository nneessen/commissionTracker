// supabase/functions/_shared/temporaryAccess.ts
// Server-side temporary access logic mirroring src/lib/temporaryAccess.ts
// This ensures Edge Functions grant the same free access as the frontend

/**
 * End date for temporary free access period.
 * After this date, normal subscription gating resumes.
 */
const TEMPORARY_ACCESS_END_DATE = new Date("2026-02-01T00:00:00Z");

/**
 * Features that are EXCLUDED from temporary free access.
 * These features will still require proper subscription even during the free period.
 */
const EXCLUDED_FEATURES = ["recruiting"];

/**
 * Check if we are currently in the temporary free access period.
 * Returns true until Feb 1, 2026 00:00 UTC.
 */
export function isTemporaryFreeAccessPeriod(): boolean {
  return new Date() < TEMPORARY_ACCESS_END_DATE;
}

/**
 * Check if Instagram access should be granted during temporary period.
 * Instagram messaging is NOT in the excluded features list,
 * so this returns true until Feb 1, 2026.
 */
export function shouldGrantTemporaryInstagramAccess(): boolean {
  if (!isTemporaryFreeAccessPeriod()) {
    return false;
  }
  // instagram_messaging is NOT in excluded features, so grant access
  return !EXCLUDED_FEATURES.includes("instagram_messaging");
}

/**
 * Check if a specific feature should be granted free access during the temporary period.
 * @param feature - The feature key to check
 * @returns true if the feature should have free access
 */
export function shouldGrantTemporaryAccess(feature: string): boolean {
  if (!isTemporaryFreeAccessPeriod()) {
    return false;
  }
  return !EXCLUDED_FEATURES.includes(feature);
}
