# Instagram Token Expiry Fix - January 16, 2026

## Problem
Instagram messaging sync was failing with OAuth error 190 "Session has expired". The token expired after ~1 hour instead of the expected 60 days.

## Root Cause
The OAuth callback (`instagram-oauth-callback/index.ts`) was **skipping the critical token exchange step**:

1. Initial OAuth gives a **short-lived token** (~1 hour) from `api.instagram.com/oauth/access_token`
2. The code INCORRECTLY assumed this token was already long-lived (60 days)
3. A comment in the code falsely claimed `ig_exchange_token` wasn't supported for Instagram API with Instagram Login

## Fix Applied
Updated `supabase/functions/instagram-oauth-callback/index.ts` to:

1. Exchange short-lived token for long-lived token via:
   ```
   GET https://graph.instagram.com/access_token
     ?grant_type=ig_exchange_token
     &client_secret={app-secret}
     &access_token={short-lived-token}
   ```

2. If exchange fails, fall back to short-lived token with **correct 1-hour expiry** (not 60 days)

## User Action Required
Users with existing expired tokens must **reconnect their Instagram account** to get a new long-lived token. The token refresh system can only refresh valid tokens, not expired ones.

## References
- [Instagram API Token Exchange](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login)
- Long-lived tokens: ~60 days validity
- Can refresh via `ig_refresh_token` while token is still valid
