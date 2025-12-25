# Slack Integration Implementation

## Overview
Implemented complete Slack integration for automated policy sale notifications and daily sales leaderboards.

## Architecture
- One Slack workspace per IMO
- Multiple channels for different agencies (Founders Financial, Self Made Financial, etc.)
- Automated notifications when policies are created
- Leaderboard updates posted after each sale

## Database Schema
Created 3 new tables in `20251225_001_slack_integration.sql`:
1. **slack_integrations** - Stores workspace connections per IMO (OAuth tokens encrypted)
2. **slack_channel_configs** - Maps agencies/notification types to channels
3. **slack_messages** - Audit trail of sent messages

Enums created:
- `slack_notification_type`
- `slack_connection_status`
- `slack_message_status`

## Edge Functions Created
- `supabase/functions/slack-oauth-callback/` - Handles OAuth flow
- `supabase/functions/slack-list-channels/` - Lists available channels
- `supabase/functions/slack-send-message/` - Core message sending
- `supabase/functions/slack-policy-notification/` - Policy event handler with leaderboard

## Frontend Files
- `src/types/slack.types.ts` - TypeScript types
- `src/services/slack/slackService.ts` - Service layer
- `src/hooks/slack/useSlackIntegration.ts` - React Query hooks

### UI Components
Settings Integrations:
- `src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx`
- `src/features/settings/integrations/components/slack/SlackChannelConfigList.tsx`
- `src/features/settings/integrations/components/slack/SlackChannelConfigDialog.tsx`

Messages Page:
- `src/features/messages/components/slack/SlackTabContent.tsx`

## Database Trigger
`20251225_002_slack_policy_trigger.sql` - Fires edge function on policy INSERT via pg_net

## Environment Variables Required
```
SLACK_CLIENT_ID=<from Slack App>
SLACK_CLIENT_SECRET=<from Slack App>
SLACK_SIGNING_SECRET=<from Slack App>
```

## Slack App Scopes Required
- `chat:write`
- `channels:read`
- `channels:join`
- `users:read`

## Message Templates
- Policy Sale Notification: Agent, AP, Carrier, Product, Effective Date, Policy #
- Leaderboard: Top 10 agents ranked by total premium with agency total
