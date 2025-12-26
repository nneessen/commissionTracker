# Continuation Prompt: Multi-Slack Workspace OAuth Fix

## Status: BLOCKED - Needs Research Solution

## Problem Summary
Users cannot connect multiple Slack workspaces. When clicking "Add Workspace", Slack automatically redirects to the existing workspace (`thestandard-v8k2190.slack.com/oauth`) instead of showing a workspace picker.

## What's Already Been Done

### 1. Database Schema (COMPLETE)
- Removed UNIQUE constraint on `imo_id` in `slack_integrations` table
- Migration: `20251225_006_multi_slack_workspace.sql`
- Added `display_name` column
- User preferences now use JSONB `policy_post_channels` format

### 2. Service Layer (COMPLETE)
- `slackService.ts` - Added `getIntegrations()`, `getIntegrationById()`, multi-workspace methods
- `userSlackPreferencesService.ts` - Updated for new JSONB format

### 3. Hooks (COMPLETE)
- `useSlackIntegrations()` - Returns array of all workspaces
- All hooks updated for multi-workspace support

### 4. UI (COMPLETE)
- `SlackIntegrationCard.tsx` - Completely rewritten to show multiple workspaces
- Expandable cards per workspace with settings

### 5. Edge Functions (DEPLOYED)
- `slack-policy-notification` - Filters by `integration_id`
- `slack-list-channels` - Accepts `integrationId` parameter
- `slack-join-channel` - Accepts `integrationId` parameter
- `slack-test-connection` - Accepts `integrationId` parameter
- `slack-oauth-callback` - Uses `team_id` as conflict key (not `imo_id`)

### 6. OAuth Init (CURRENT CODE)
```typescript
// supabase/functions/slack-oauth-init/index.ts lines 75-79
const authUrl = new URL("https://slack.com/oauth/v2/authorize");
authUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
authUrl.searchParams.set("scope", scope);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("state", signedState);
// NO team parameter - should show picker but doesn't
```

## The Unsolved Issue

**Symptom**: OAuth URL redirects from `slack.com/oauth/v2/authorize` to `thestandard-v8k2190.slack.com/oauth` automatically, bypassing workspace picker.

**What we've verified**:
- Slack app IS in "Distributed" mode (confirmed by user)
- Code does NOT include `team` parameter
- OAuth callback correctly uses `team_id` as conflict key

**What we need to research**:
1. Is there a Slack OAuth parameter to force workspace picker? (like Google's `prompt=select_account`)
2. Has Slack changed OAuth behavior recently?
3. Is the redirect happening due to browser cookies/session?
4. Are there alternative OAuth endpoints or parameters?
5. How do apps like Zapier, Linear, GitHub handle this?

## User's Observed URL
```
https://thestandard-v8k2190.slack.com/oauth?client_id=10187856089350.10186472717237&scope=chat%3Awrite%2Cchannels%3Aread%2Cchannels%3Ajoin%2Cusers%3Aread&user_scope=&redirect_uri=https%3A%2F%2Fpcyaqwodnyrpkaiojnpz.supabase.co%2Ffunctions%2Fv1%2Fslack-oauth-callback&state=...
```

Note: URL is ALREADY at `thestandard-v8k2190.slack.com` - the redirect happens before user sees any picker.

## Files to Reference
- `supabase/functions/slack-oauth-init/index.ts` - OAuth URL generation
- `supabase/functions/slack-oauth-callback/index.ts` - Token exchange
- `src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx` - UI

## Next Steps for New Session
1. Deep research Slack OAuth API for workspace picker parameters
2. Check Slack API changelog for recent changes
3. Search GitHub issues, Stack Overflow for this exact problem
4. Consider if we need a different OAuth flow or endpoint
5. Test in incognito to rule out cookie issues
6. Potentially reach out to Slack developer support

## Slack App Details
- Client ID: `10187856089350.10186472717237`
- Supabase Project: `pcyaqwodnyrpkaiojnpz`
- Redirect URI: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/slack-oauth-callback`
