# CRITICAL: Password Reset Flow - DO NOT BREAK

## Overview
The password reset flow is fragile due to Supabase's redirect URL whitelisting and automatic token processing. This document explains the flow and what MUST NOT change.

## The Problem (Historical Context)
Password reset was broken multiple times because:
1. Supabase only allows redirects to whitelisted URLs in dashboard settings
2. `/auth/reset-password` was NOT in the whitelist
3. Supabase silently redirected to root `/` instead
4. Users got authenticated but never saw the reset form

## Current Solution Architecture

### Redirect Flow (DO NOT CHANGE)
```
Email Link → Supabase Verify → /auth/callback → /auth/reset-password
```

**CRITICAL**: All password reset `redirectTo` URLs MUST point to `/auth/callback`, NOT `/auth/reset-password`.

### Files Involved

1. **`src/index.tsx`** - Early hash capture IIFE
   - Runs BEFORE any imports/Supabase initialization
   - Captures `type=recovery` hash to sessionStorage
   - Redirects to `/auth/reset-password` if user lands elsewhere

2. **`src/features/auth/AuthCallback.tsx`** - Recovery type handler
   - Detects `type === "recovery"` in hash
   - Stores hash in sessionStorage (backup)
   - Redirects to `/auth/reset-password` with hash

3. **`src/features/auth/ResetPassword.tsx`** - Reset form
   - Waits for auth loading to complete
   - Checks URL hash OR sessionStorage OR session
   - Shows form if any valid auth source found

4. **`src/contexts/AuthContext.tsx`** - `resetPassword()` function
   - Used by login page "Forgot Password"
   - MUST use `redirectTo: /auth/callback`

5. **`src/features/admin/components/EditUserDialog.tsx`** - Admin send confirmation
   - `handleResendInvite()` function
   - MUST use `redirectTo: /auth/callback`

6. **`src/features/recruiting/components/RecruitDetailPanel.tsx`** - Recruit invite
   - `handleResendInvite()` function  
   - MUST use `redirectTo: /auth/callback`

7. **`supabase/functions/send-password-reset/index.ts`** - Edge function
   - Default `redirectTo` MUST be `/auth/callback`

8. **`supabase/functions/create-auth-user/index.ts`** - Edge function
   - Password reset link `redirectTo` MUST be `/auth/callback`

## Rules for Future Development

### NEVER DO:
- Change `redirectTo` to `/auth/reset-password` directly
- Remove the early hash capture in `index.tsx`
- Remove sessionStorage backup in AuthCallback/ResetPassword
- Assume Supabase will redirect to the specified URL (it may not if not whitelisted)

### ALWAYS DO:
- Use `/auth/callback` as redirectTo for ALL password/recovery flows
- Test password reset flow after ANY auth-related changes
- Keep the multi-layer fallback (hash → sessionStorage → session)

## Testing Checklist
After ANY changes to auth, test:
1. [ ] Login page → Forgot Password → Click email link → See reset form
2. [ ] Admin → Edit User → Actions → Send Confirmation → Click email link → See reset form
3. [ ] User lands on reset form, NOT dashboard with full access

## Supabase Dashboard Settings
Ensure these URLs are in **Authentication → URL Configuration → Redirect URLs**:
- `https://www.thestandardhq.com/auth/callback`
- `https://thestandardhq.com/auth/callback`
- `http://localhost:5173/auth/callback` (for local dev)
