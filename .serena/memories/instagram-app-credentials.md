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

## OAuth Callback Troubleshooting (Jan 2026)

### Profile Fetch Fields
The `/me` endpoint requires these exact fields:
```
id,username,name,account_type
```

**DO NOT USE:**
- `user_id` (wrong - use `id`)
- `profile_picture_url` (not supported for Business API)

### Duplicate Key Constraint
The `instagram_integrations` table has unique constraint on `(user_id, imo_id)`.
The OAuth callback must check for existing records by BOTH:
1. `user_id + imo_id` (user reconnecting)
2. `instagram_user_id + imo_id` (same Instagram account)

### Key File
`supabase/functions/instagram-oauth-callback/index.ts`
