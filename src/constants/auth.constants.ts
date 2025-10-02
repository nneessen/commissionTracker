// src/constants/auth.constants.ts

/**
 * Authentication-related constants
 *
 * Centralized configuration for auth flow behavior including
 * session storage keys, rate limiting, and verification settings.
 */

/**
 * Session storage keys for temporary auth flow data
 * These are cleared when the tab closes for security
 */
export const SESSION_STORAGE_KEYS = {
  /** Email address awaiting verification after signup */
  VERIFICATION_EMAIL: 'pendingVerificationEmail',
} as const;

/**
 * Cooldown period (in seconds) between resend attempts
 * Prevents email bombing and API abuse
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Maximum number of resend attempts allowed per session
 * Prevents excessive email sending
 */
export const MAX_RESEND_ATTEMPTS = 3;

/**
 * Auth callback types from Supabase
 */
export const AUTH_CALLBACK_TYPES = {
  SIGNUP: 'signup',
  RECOVERY: 'recovery',
  INVITE: 'invite',
  MAGICLINK: 'magiclink',
  EMAIL_CHANGE: 'email_change',
} as const;

export type AuthCallbackType = typeof AUTH_CALLBACK_TYPES[keyof typeof AUTH_CALLBACK_TYPES];
