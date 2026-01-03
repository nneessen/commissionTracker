# Instagram DM Integration - Milestone 2 Continuation

## Context
We're implementing Instagram DM integration for the Messages page. Milestone 1 (Foundation) is complete.

## What's Done (Milestone 1) ✅
- **6 Database migrations applied:**
  - `20260103_004_instagram_enums.sql` - Enums (connection_status, message_type, etc.)
  - `20260103_005_instagram_integrations.sql` - OAuth tokens table
  - `20260103_006_instagram_conversations_messages.sql` - Conversations & messages
  - `20260103_007_instagram_scheduled_templates.sql` - Scheduled messages, templates, usage
  - `20260103_008_instagram_lead_source.sql` - Extended recruiting_leads with lead_source
  - `20260103_009_instagram_billing_feature.sql` - Added instagram_messaging to Team tier

- **TypeScript types:** `src/types/instagram.types.ts` (complete with query keys, helpers)

- **Billing:** `instagram_messaging` feature added to Team tier ($50/mo)

## Current Task: Milestone 2 - OAuth & Edge Functions

Create the following Supabase Edge Functions:

### 1. `instagram-oauth-init`
- Generate Meta OAuth URL with required scopes
- Scopes needed: `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`
- Store state with userId, imoId, timestamp for callback verification
- Return OAuth URL for frontend redirect

### 2. `instagram-oauth-callback`
- Verify state parameter
- Exchange authorization code for short-lived token
- Exchange short-lived for long-lived token (60 days)
- Get Instagram Business Account ID from connected Facebook Page
- Encrypt and store tokens in `instagram_integrations` table
- Redirect back to app with success/error

### 3. `instagram-refresh-token` (CRON)
- Find tokens expiring within 7 days
- Call Meta token refresh endpoint
- Update encrypted tokens and expiry
- Should run daily

### Also Create:
- `src/services/instagram/instagramService.ts` - Service layer (OAuth methods first)
- `src/hooks/instagram/useInstagramIntegration.ts` - TanStack Query hooks

## Reference Files
- **Slack OAuth pattern:** `supabase/functions/slack-oauth-init/`, `slack-oauth-callback/`
- **Slack service:** `src/services/slack/slackService.ts`
- **Slack hooks:** `src/hooks/slack/useSlackIntegration.ts`
- **Instagram types:** `src/types/instagram.types.ts`

## Plan Location
Full plan with all milestones: `plans/active/instagram-dm-integration.md`

## Environment Variables Needed
```
INSTAGRAM_APP_ID=<from Meta Developer Console>
INSTAGRAM_APP_SECRET=<from Meta Developer Console>
```

## Meta API Endpoints Reference
- OAuth URL: `https://www.facebook.com/v18.0/dialog/oauth`
- Token exchange: `https://graph.facebook.com/v18.0/oauth/access_token`
- Long-lived token: `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token`
- Get IG accounts: `https://graph.facebook.com/v18.0/me/accounts` then `/{page-id}?fields=instagram_business_account`

## Instructions
1. Read the full plan at `plans/active/instagram-dm-integration.md`
2. Check existing Slack edge functions for patterns
3. Create the 3 edge functions listed above
4. Create the service layer with OAuth methods
5. Create the hooks for integration management
6. Update the plan file to mark completed items
7. Run typecheck before committing
