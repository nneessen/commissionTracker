// src/lib/temporaryAccess.ts
// Special access constants and helpers
// NOTE: Temporary access period configuration has moved to database (subscription_settings table)
// Use useTemporaryAccessConfig hook or subscriptionSettingsService for temporary access checks

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

// ============================================================================
// DEPRECATED: The following functions are kept for backward compatibility
// but should be replaced with database-driven checks via useTemporaryAccessConfig
// ============================================================================

/**
 * @deprecated Use subscriptionSettingsService.shouldGrantTemporaryAccess instead
 * This function is kept only for backward compatibility during migration
 */
export function shouldGrantTemporaryAccess(): boolean {
  // Always return false - actual logic now comes from database
  // This ensures any stale code paths fail safely (deny access)
  console.warn(
    "shouldGrantTemporaryAccess() is deprecated. Use database-driven config via useTemporaryAccessConfig hook.",
  );
  return false;
}

/**
 * @deprecated Use subscriptionSettingsService.getDaysRemaining instead
 */
export function getTemporaryAccessDaysRemaining(): number {
  console.warn(
    "getTemporaryAccessDaysRemaining() is deprecated. Use database-driven config via useTemporaryAccessConfig hook.",
  );
  return 0;
}

/**
 * @deprecated Temporary access config now stored in database
 */
export function isTemporaryFreeAccessPeriod(): boolean {
  console.warn(
    "isTemporaryFreeAccessPeriod() is deprecated. Use database-driven config via useTemporaryAccessConfig hook.",
  );
  return false;
}

/**
 * @deprecated Test emails now stored in database subscription_settings table
 */
export function isSubscriptionTestEmail(): boolean {
  console.warn(
    "isSubscriptionTestEmail() is deprecated. Test emails are now configured in the admin panel.",
  );
  return false;
}
