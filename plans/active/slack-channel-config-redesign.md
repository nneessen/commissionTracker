# Slack Channel Configuration Redesign

## Session Date: 2025-12-25

## Problem Statement

The current "Channel Notifications" configuration in Settings → Integrations → Slack is over-engineered and makes no sense:

### Issues to Fix

1. **Hardcoded notification types that don't belong:**
   - `policy_cancelled` - Not needed, remove
   - `weekly_summary` - Not implemented, remove
   - `commission_milestone` - Not implemented, remove
   - These are hardcoded in `src/features/settings/integrations/components/slack/SlackChannelConfigDialog.tsx`

2. **Not all channels need notification routing:**
   - The #general channel doesn't need "notification type" configuration
   - Most channels are just for chatting, not automated notifications
   - The current UI forces every channel to have a notification type

3. **Over-complicated configuration dialog:**
   - File: `src/features/settings/integrations/components/slack/SlackChannelConfigDialog.tsx`
   - Forces selection of notification type, agency filtering, etc.
   - Most users just want to pick a channel to post policy sales to

4. **Database has unnecessary complexity:**
   - `slack_channel_configs` table with `notification_type` enum
   - `slack_messages` table tracking notification types
   - Migration: `supabase/migrations/20251225_001_slack_integration.sql`

## What Should Actually Exist

### Simple Configuration:
1. **Policy Sales Channel** - Pick ONE channel where new policy sales get posted
2. **Daily Leaderboard Channel** - Pick ONE channel for daily leaderboard (can be same as above)
3. That's it. No per-channel notification types. No complex routing.

### Proposed Simplification:

Instead of `slack_channel_configs` table with multiple rows per IMO, just add two columns to `slack_integrations`:
```sql
ALTER TABLE slack_integrations ADD COLUMN policy_channel_id TEXT;
ALTER TABLE slack_integrations ADD COLUMN policy_channel_name TEXT;
ALTER TABLE slack_integrations ADD COLUMN leaderboard_channel_id TEXT;
ALTER TABLE slack_integrations ADD COLUMN leaderboard_channel_name TEXT;
```

### Simple UI:
```
Slack Settings
├── Connected to: The Standard ✓
├── Policy Sales Channel: [Dropdown: #sales-wins]
├── Daily Leaderboard Channel: [Dropdown: #sales-wins]
└── [Disconnect]
```

## Files to Modify

### Remove/Simplify:
- `src/features/settings/integrations/components/slack/SlackChannelConfigDialog.tsx` - DELETE or heavily simplify
- `src/features/settings/integrations/components/slack/SlackChannelConfigList.tsx` - DELETE
- `src/types/slack.types.ts` - Remove `CreateChannelConfigForm`, `UpdateChannelConfigForm`, notification type enums

### Modify:
- `src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx` - Add simple channel dropdowns
- `src/hooks/slack/useSlackIntegration.ts` - Remove channel config hooks, add simple update mutation
- `src/services/slack/slackService.ts` - Remove channel config methods

### Database:
- Create migration to add `policy_channel_id`, `policy_channel_name`, `leaderboard_channel_id`, `leaderboard_channel_name` to `slack_integrations`
- Can keep `slack_channel_configs` table for now (backwards compat) but stop using it
- Update `slack_notification_type` enum to only have: `policy_created`, `daily_leaderboard`

### Edge Functions:
- `slack-policy-notification` - Use `policy_channel_id` from `slack_integrations` directly
- `slack-daily-leaderboard` - Use `leaderboard_channel_id` from `slack_integrations` directly

## Implementation Steps

1. Create migration to add channel columns to `slack_integrations`
2. Update `SlackIntegrationCard.tsx` to show simple channel dropdowns
3. Update edge functions to read channel from `slack_integrations` directly
4. Remove the complex channel config components
5. Clean up unused types and hooks

## Key Principle

The Slack integration should be SIMPLE:
- Connect workspace ✓
- Pick channel for policy notifications
- Pick channel for leaderboard
- Done

No notification type routing. No agency filtering. No complex configuration dialogs.
