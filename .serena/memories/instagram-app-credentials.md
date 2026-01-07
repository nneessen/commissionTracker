# Instagram/Meta App Credentials

## Meta App ID
**App ID:** 858157193486561

## Direct Links
- **Dashboard:** https://developers.facebook.com/apps/858157193486561/dashboard/
- **App Review (Live Mode):** https://developers.facebook.com/apps/858157193486561/app-review/
- **Settings:** https://developers.facebook.com/apps/858157193486561/settings/basic/

## Instagram User ID (from integration)
**IG User ID:** 17841401907010491

## Supabase Secrets
The following are stored as encrypted Supabase secrets:
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`

## OAuth Callback (FIXED Jan 7, 2026)

### Profile Fetch - CORRECT Configuration

**Instagram Graph API does NOT have a `/me` endpoint!** That's Facebook's API.

Use `/{user_id}` endpoint where `user_id` comes from the token response:
```
GET https://graph.instagram.com/v21.0/{instagramUserId}?fields=id,username,name,account_type
```

**CRITICAL - DO NOT USE:**
- `/me` endpoint - Does NOT exist for Instagram Graph API (causes IGApiException 100)
- `user_id` as a FIELD - It's only valid in the URL path, not as a requested field
- `profile_picture_url` - Not supported in Instagram Business API

**The distinction:**
- `instagramUserId` (from token) = goes in URL PATH: `/{instagramUserId}`
- `id` (from response) = the IGSID we store, matches webhooks

### ID Storage - CRITICAL
The `instagram_user_id` column MUST store the value from `igProfile.id` returned by `/me`.
This ID is the IGSID format (e.g., `17841401907010491`) that:
1. Matches webhook `entry.id` for routing incoming messages
2. Matches conversation participant IDs for self/other detection

**DO NOT store:**
- Token's `user_id` from access_token response (different format!)
- Any fallback values - if `/me` doesn't return `id`, fail the OAuth

### Participant Matching in Conversations
Use BOTH username AND ID matching with OR logic:
- A participant is "us" if username matches OR id matches
- A participant is "other" if NEITHER matches

### Duplicate Key Constraint
The `instagram_integrations` table has unique constraint on `(user_id, imo_id)`.
The OAuth callback checks for existing records by BOTH:
1. `user_id + imo_id` (user reconnecting)
2. `instagram_user_id + imo_id` (same Instagram account)

### Key Files
- `supabase/functions/instagram-oauth-callback/index.ts` - OAuth flow
- `supabase/functions/instagram-get-conversations/index.ts` - Conversation sync
- `supabase/functions/instagram-webhook/index.ts` - Inbound message handling
