# Slack Integration Continuation

## Session Date: 2025-12-25

## Current State

### What Works
- Slack OAuth flow is functional (connect/disconnect)
- 8 edge functions deployed:
  - `slack-oauth-init` - Generates signed OAuth URL
  - `slack-oauth-callback` - Handles OAuth callback, stores encrypted tokens
  - `slack-test-connection` - Tests Slack connection
  - `slack-join-channel` - Joins bot to channels
  - `slack-list-channels` - Lists workspace channels
  - `slack-send-message` - Sends messages
  - `slack-policy-notification` - Triggered on policy creation
  - `slack-daily-leaderboard` - Posts leaderboard
- Database tables created: `slack_integrations`, `slack_channel_configs`, `slack_messages`
- CORS restricted to production domains
- OAuth state is HMAC-signed for security

### What's Broken/Incomplete
1. **User needs to reconnect Slack** - Added new scopes after initial connection, token doesn't have them. User must disconnect and reconnect.

2. **Channel listing returns `missing_scope`** - After reconnecting with new scopes, this should work.

3. **Slack tab in Messages page is completely wrong**:
   - Currently shows a basic message history list
   - Should **mirror the actual Slack workspace UI**
   - The left sidebar should transform to show Slack channels (not app folders)
   - Should feel like using Slack natively within the app

4. **Post Leaderboard button** - Unclear what it should do. Needs definition.

## Scopes Added to Slack App
User added comprehensive scopes for full Slack integration:
- chat:write, chat:write.customize
- channels:read, channels:join, channels:history
- groups:read, groups:write, groups:history
- im:read, im:write, im:history
- mpim:read, mpim:write, mpim:history
- users:read, users:read.email, users.profile:read
- team:read
- reactions:read, reactions:write
- files:read, files:write
- pins:read, pins:write

## Slack App Credentials (already set in Supabase secrets)
- SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET are configured
- App redirect URL: `https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/slack-oauth-callback`

## Files Modified/Created This Session

### Edge Functions (supabase/functions/)
- `_shared/cors.ts` - Shared CORS config (restricts to production domains)
- `_shared/hmac.ts` - HMAC signing for OAuth state
- `slack-oauth-init/index.ts` - NEW
- `slack-oauth-callback/index.ts` - Updated to use HMAC state
- `slack-test-connection/index.ts` - NEW
- `slack-join-channel/index.ts` - NEW
- `slack-list-channels/index.ts` - Updated CORS
- `slack-send-message/index.ts` - Updated CORS
- `slack-policy-notification/index.ts` - Updated CORS
- `slack-daily-leaderboard/index.ts` - NEW

### Frontend
- `src/services/slack/slackService.ts` - OAuth now calls edge function
- `src/hooks/slack/useSlackIntegration.ts` - Updated for async OAuth
- `src/features/messages/components/slack/SlackTabContent.tsx` - Needs complete redesign
- `src/features/settings/integrations/components/slack/*` - Config UI exists

### Migrations
- `supabase/migrations/20251225_001_slack_integration.sql` - Tables and RLS
- `supabase/migrations/20251225_002_slack_policy_trigger.sql` - Auto-notify trigger
- `supabase/migrations/20251225_003_fix_slack_policy_trigger.sql` - Fixed to use vault

## Next Steps (Priority Order)

### 1. Fix Immediate Issues
- [ ] User must disconnect and reconnect Slack to get new scopes
- [ ] Verify channel listing works after reconnection
- [ ] Test sending a message to a channel

### 2. Redesign Slack Tab in Messages Page
The current implementation is completely wrong. Requirements:
- [ ] When user clicks "Slack" tab, the LEFT SIDEBAR should transform to show:
  - Slack workspace name at top
  - Channels section (list of channels from workspace)
  - Direct Messages section
  - Collapse/expand functionality like real Slack
- [ ] Main content area should show:
  - Selected channel's message history
  - Message composer at bottom
  - Thread support (replies in sidebar?)
- [ ] Should fetch real messages from Slack API (need new edge function: `slack-get-messages`)
- [ ] Should allow sending messages from the UI
- [ ] Real-time updates (Slack events API or polling)

### 3. Define Leaderboard Feature
- What does "Post Leaderboard" do exactly?
- Which channels should it post to?
- What data should be in the leaderboard?
- Should it be automatic (daily) or manual trigger?

### 4. Policy Notification Feature
- When a policy is created, should automatically post to configured Slack channels
- Database trigger exists but needs vault secrets configured:
  ```sql
  INSERT INTO vault.secrets (name, secret) VALUES ('supabase_url', 'https://pcyaqwodnyrpkaiojnpz.supabase.co');
  INSERT INTO vault.secrets (name, secret) VALUES ('supabase_service_key', '<service-role-key>');
  ```

## Database Check Commands
```bash
# Check slack integration status
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT id, imo_id, team_name, is_active, connection_status FROM slack_integrations;"

# Check channel configs
PGPASSWORD="N123j234n345!\$!" psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT * FROM slack_channel_configs;"
```

## Test Commands
```bash
# Test list channels (after user reconnects)
curl -s -X POST "https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/slack-list-channels" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"imoId": "ffffffff-ffff-ffff-ffff-ffffffffffff"}'
```

## Questions for User
1. What exactly should the Slack tab look like? Full Slack mirror or simplified?
2. Should users be able to send messages FROM the app TO Slack?
3. What channels should policy notifications go to?
4. Should there be per-agent or per-agency channel configurations?
5. What should the leaderboard show and how often should it post?
