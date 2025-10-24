// src/constants/auth.constants.ts

export const SESSION_STORAGE_KEYS = {
  VERIFICATION_EMAIL: "pendingVerificationEmail",
} as const;

export const RESEND_COOLDOWN_SECONDS = 60;

export const MAX_RESEND_ATTEMPTS = 3;

export const AUTH_CALLBACK_TYPES = {
  SIGNUP: "signup",
  RECOVERY: "recovery",
  INVITE: "invite",
  MAGICLINK: "magiclink",
  EMAIL_CHANGE: "email_change",
} as const;

export type AuthCallbackType =
  (typeof AUTH_CALLBACK_TYPES)[keyof typeof AUTH_CALLBACK_TYPES];
