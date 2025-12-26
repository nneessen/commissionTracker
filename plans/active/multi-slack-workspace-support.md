# Continuation: Multi-Slack Workspace Support

## Context
The current Slack integration only supports **one workspace per IMO**. Users need the ability to connect to **multiple Slack workspaces** so that policy sales can be posted to channels across different workspaces.

## Current Architecture
- `slack_integrations` table has a **UNIQUE constraint on `imo_id`** (one workspace per IMO)
- Each integration stores OAuth tokens for one Slack workspace
- Users can only select channels from the single connected workspace
- "Additional Channels for My Sales" only shows channels from that one workspace

## Requirements
1. **Multiple workspaces per IMO** - An IMO should be able to connect 2+ Slack workspaces
2. **Per-user workspace selection** - Users should be able to choose which workspaces/channels to post to
3. **Cross-workspace posting** - When a policy is created, post to channels across multiple workspaces
4. **Clear UI** - Settings must clearly show which workspace each channel belongs to

## Key Questions to Resolve

### 1. OAuth & API Credentials
- **Each Slack workspace requires its own OAuth connection** (separate bot tokens)
- The Slack app must be installed in each workspace by an admin of that workspace
- No way around this - Slack's security model requires per-workspace authorization

### 2. Database Schema Changes Needed
```sql
-- Remove UNIQUE constraint on imo_id
-- Add display_name or alias for workspace identification
ALTER TABLE slack_integrations DROP CONSTRAINT slack_integrations_imo_id_key;
ALTER TABLE slack_integrations ADD COLUMN display_name TEXT;

-- Update user_slack_preferences to reference specific integrations
-- Current: policy_post_channel_ids TEXT[] (just channel IDs)
-- Needed: Store workspace + channel pairs
ALTER TABLE user_slack_preferences
  DROP COLUMN policy_post_channel_ids,
  DROP COLUMN policy_post_channel_names,
  ADD COLUMN policy_post_channels JSONB DEFAULT '[]';
  -- Format: [{ "integration_id": "uuid", "channel_id": "C123", "channel_name": "sales" }, ...]
```

### 3. UI Changes Needed

**Settings → Integrations → Slack:**
- Show list of connected workspaces (not just one)
- "Connect Another Workspace" button
- Each workspace card shows: name, status, disconnect button

**Settings → Integrations → Slack → Your Preferences:**
- "Additional Channels" section needs redesign:
  - Group channels by workspace
  - Show workspace name as header
  - Checkboxes for channels under each workspace
  - Example:
    ```
    ◆ Workspace: Team Alpha
      ☑ #daily-sales
      ☐ #announcements

    ◆ Workspace: Team Beta
      ☐ #sales-channel
      ☑ #leaderboard
    ```

### 4. Edge Function Changes
`slack-policy-notification` needs to:
1. Fetch user's `policy_post_channels` (with integration IDs)
2. Group channels by integration_id
3. For each integration, decrypt its bot token
4. Post to that integration's channels
5. Handle failures per-workspace (don't fail all if one workspace has issues)

### 5. Messages Page Changes
- Slack tab sidebar should show workspaces as top-level grouping
- User can expand workspace to see channels
- Or: flat list with workspace badge on each channel

## Implementation Steps

1. **Database Migration**
   - Remove unique constraint on `slack_integrations.imo_id`
   - Add `display_name` column to identify workspaces
   - Restructure `user_slack_preferences` for multi-workspace channels

2. **Update SlackIntegrationCard**
   - Support multiple connected workspaces
   - "Add Workspace" flow
   - List view of all workspaces with individual settings

3. **Update User Preferences UI**
   - Redesign channel selection to group by workspace
   - Store integration_id with each channel selection

4. **Update Edge Functions**
   - `slack-policy-notification`: Post to multiple workspaces
   - `slack-list-channels`: Accept integration_id parameter (not just imo_id)

5. **Update Messages Page**
   - Show channels grouped by workspace
   - Handle workspace selection state

## Open Questions
- Should there be a "master sales channel" per workspace, or one global master?
- Should IMO admins be able to restrict which workspaces agents can post to?
- Rate limiting considerations when posting to many channels across workspaces?

## Files to Modify
- `supabase/migrations/` - New migration for schema changes
- `src/types/slack.types.ts` - Update types
- `src/services/slack/slackService.ts` - Multi-workspace support
- `src/services/slack/userSlackPreferencesService.ts` - New channel format
- `src/hooks/slack/useSlackIntegration.ts` - Fetch multiple integrations
- `src/features/settings/integrations/components/slack/SlackIntegrationCard.tsx` - Multi-workspace UI
- `supabase/functions/slack-policy-notification/index.ts` - Cross-workspace posting
- `supabase/functions/slack-list-channels/index.ts` - Integration-specific listing
- `src/features/messages/MessagesPage.tsx` - Workspace grouping in sidebar
