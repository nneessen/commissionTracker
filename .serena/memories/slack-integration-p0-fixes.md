# Slack Integration P0 Fixes (2025-12-25)

## Summary
Fixed critical P0 blockers identified in code review for the Slack integration.

## Changes Made

### 1. Created Missing Edge Functions
- `supabase/functions/slack-test-connection/index.ts` - Tests Slack connection via auth.test API
- `supabase/functions/slack-join-channel/index.ts` - Joins bot to a Slack channel
- `supabase/functions/slack-daily-leaderboard/index.ts` - Posts daily sales leaderboard
- `supabase/functions/slack-oauth-init/index.ts` - Generates signed OAuth URL (NEW - for HMAC state signing)

### 2. Fixed Database Trigger
- Created `supabase/migrations/20251225_003_fix_slack_policy_trigger.sql`
- Changed from `current_setting('app.settings.*')` to use Supabase Vault for secrets
- Requires manual setup of vault secrets (see migration comments)

### 3. Fixed CORS Security
- Created `supabase/functions/_shared/cors.ts` with restricted origin list
- Updated all Slack edge functions to use the new CORS helper
- Restricts origins to:
  - `https://www.thestandardhq.com`
  - `https://thestandardhq.com`
  - `http://localhost:5173` (dev)
  - `http://localhost:3000` (dev alt)

### 4. Added HMAC State Signing
- Created `supabase/functions/_shared/hmac.ts` with HMAC-SHA256 signing
- OAuth state is now signed with `SLACK_SIGNING_SECRET`
- Updated `slack-oauth-callback` to verify signed state
- Updated `slackService.ts` to call `slack-oauth-init` for server-side state generation
- Removed client-side state generation (security improvement)

## Required Setup Steps

Before deploying, ensure these secrets are set in Supabase:

```bash
npx supabase secrets set SLACK_CLIENT_ID=<your-client-id>
npx supabase secrets set SLACK_CLIENT_SECRET=<your-client-secret>
npx supabase secrets set SLACK_SIGNING_SECRET=<your-signing-secret>
npx supabase secrets set EMAIL_ENCRYPTION_KEY=<32-byte-hex-key>
```

For the database trigger to work, run in SQL editor:
```sql
INSERT INTO vault.secrets (name, secret) VALUES ('supabase_url', 'https://YOUR-PROJECT.supabase.co');
INSERT INTO vault.secrets (name, secret) VALUES ('supabase_service_key', 'YOUR-SERVICE-ROLE-KEY');
```

## Deploy Commands
```bash
npx supabase functions deploy slack-oauth-init
npx supabase functions deploy slack-oauth-callback
npx supabase functions deploy slack-test-connection
npx supabase functions deploy slack-join-channel
npx supabase functions deploy slack-list-channels
npx supabase functions deploy slack-send-message
npx supabase functions deploy slack-policy-notification
npx supabase functions deploy slack-daily-leaderboard
```

## Remaining P1/P2 Issues (Not Fixed)
- RLS policy for `slack_messages` insert is overly permissive
- No rate limiting on edge functions
- No retry mechanism for failed Slack API calls
- `EMAIL_ENCRYPTION_KEY` naming should be `ENCRYPTION_KEY`
- Missing unit tests
- `slackService.ts` could be split into smaller modules
