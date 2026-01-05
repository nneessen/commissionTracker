# Instagram DM Integration - Continuation Prompt

**Last Updated:** 2026-01-05
**Status:** BLOCKED - Meta Developer Console access issue

---

## CRITICAL ISSUE

User cannot access Meta Developer Console. Getting "You don't have access. This feature isn't available to you yet." error when trying to access:
- https://developers.facebook.com/apps/858157193486561/dashboard/
- https://developers.facebook.com/apps/858157193486561/app-review/

This was working yesterday. Developer verification is complete. Need to resolve this access issue before the app can be switched to Live mode.

---

## Current Problem

The Instagram tab in Messages page connects successfully but returns **empty conversations**.

**API Response (200 OK):**
```json
{
  "data": [],
  "paging": {"cursors": {"after": "..."}, "next": "..."}
}
```

The API is working but returning no data. Possible causes:
1. App still in Development mode (can't switch - no console access)
2. Instagram account has no DM conversations
3. Instagram account is not Professional (Business/Creator)
4. Test user configuration issue

---

## Fixes Applied This Session (All Deployed)

### 1. Token Refresh - Fixed wrong API
**File:** `supabase/functions/instagram-refresh-token/index.ts`
- FROM: `graph.facebook.com` with `fb_exchange_token`
- TO: `graph.instagram.com/refresh_access_token` with `ig_refresh_token`

### 2. Get Conversations - Fixed endpoint
**File:** `supabase/functions/instagram-get-conversations/index.ts`
- FROM: `graph.facebook.com/v18.0/{userId}/conversations`
- TO: `graph.instagram.com/v21.0/{userId}/conversations`
- Added `platform=instagram` parameter
- Added detailed logging

### 3. Get Messages - Fixed endpoint
**File:** `supabase/functions/instagram-get-messages/index.ts`
- Changed to `graph.instagram.com/v21.0`

### 4. Send Message - Fixed endpoint
**File:** `supabase/functions/instagram-send-message/index.ts`
- Changed to `graph.instagram.com/v21.0/me/messages`

---

## Integration Details

- **Instagram User ID:** `17841401907010491`
- **Integration ID:** `fef2ba9a-6a79-46d9-92e9-51314127567d`
- **Meta App ID:** `858157193486561`

---

## Next Steps

1. **Resolve Meta Console access** - User needs to regain access to developers.facebook.com to:
   - Switch app from Development to Live mode
   - Configure webhooks
   - Check test user settings

2. **Verify Instagram account:**
   - Is it a Professional account (Business/Creator)?
   - Does it have actual DM conversations?

3. **Alternative approaches if console access lost:**
   - Create new Meta app
   - Use different Facebook account

---

## Key Files

- `supabase/functions/instagram-get-conversations/index.ts`
- `supabase/functions/instagram-oauth-callback/index.ts`
- `supabase/functions/instagram-refresh-token/index.ts`
- `supabase/functions/instagram-send-message/index.ts`
- `src/services/instagram/instagramService.ts`
- `src/features/messages/components/instagram/InstagramSidebar.tsx`

---

## Redeploy Commands

```bash
npx supabase functions deploy instagram-get-conversations --no-verify-jwt
npx supabase functions deploy instagram-get-messages --no-verify-jwt
npx supabase functions deploy instagram-send-message --no-verify-jwt
npx supabase functions deploy instagram-refresh-token --no-verify-jwt
```

---

## Resume Instructions

1. Read this file and `plans/active/instagram-dm-integration.md`
2. First priority: Help user regain Meta Developer Console access
3. If console access restored: Switch app to Live mode
4. Verify Instagram account is Professional with DM conversations
5. Goal: Get conversations to actually appear in the Instagram tab
