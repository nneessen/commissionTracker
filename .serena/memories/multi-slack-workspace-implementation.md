# Multi-Slack Workspace Implementation

## Date: 2025-12-25

## Summary
Implemented multi-Slack workspace support allowing an IMO to connect multiple Slack workspaces and configure channels across all of them for policy notifications.

## Database Changes
- **Migration**: `20251225_006_multi_slack_workspace.sql`
- Removed UNIQUE constraint on `slack_integrations.imo_id` (was `slack_integrations_imo_unique`)
- Added `display_name` column to `slack_integrations` for user-friendly workspace identification
- Restructured `user_slack_preferences`:
  - Added `policy_post_channels JSONB` column (format: `[{integration_id, channel_id, channel_name}, ...]`)
  - Added `default_view_integration_id UUID` column
  - Dropped old `policy_post_channel_ids TEXT[]` and `policy_post_channel_names TEXT[]` columns
  - Data migration preserved existing channel selections

## Service Layer Changes
- `slackService.ts`:
  - Added `getIntegrations(imoId)` - returns array of all integrations
  - Added `getIntegrationById(integrationId)` - single integration by ID
  - Added `disconnectById(integrationId)`, `deleteIntegrationById(integrationId)`
  - Added `updateIntegrationSettings(integrationId, settings)`
  - Added `listChannelsById(integrationId)`, `joinChannelById(integrationId, channelId)`
  - Added `testConnectionById(integrationId)`
  - Original methods preserved with @deprecated tags for backward compatibility

- `userSlackPreferencesService.ts`:
  - Updated to handle `PolicyPostChannel[]` JSONB format
  - Added helper methods: `addPolicyPostChannel`, `removePolicyPostChannel`, `togglePolicyPostChannel`
  - Added `getPolicyPostChannelsByIntegration()` for grouped channel access

## Hook Changes
- `useSlackIntegration.ts`:
  - Added `useSlackIntegrations()` - returns array of all integrations
  - Added `useSlackIntegrationById(integrationId)`
  - Added `useDisconnectSlackById()`, `useTestSlackConnectionById()`
  - Added `useUpdateSlackIntegrationSettings()`
  - Added `useSlackChannelsById(integrationId)`, `useJoinSlackChannelById()`
  - Original hooks preserved for backward compatibility

- `useUserSlackPreferences.ts`:
  - Updated `useSetDefaultSlackChannel()` to include integrationId
  - Updated `useSetPolicyPostChannels()` to accept `PolicyPostChannel[]`
  - Added `useTogglePolicyPostChannel()`

## Type Changes
- `slack.types.ts`:
  - Added `PolicyPostChannel` interface
  - Updated `UserSlackPreferences` to use `Omit` for proper JSONB typing
  - Updated `slackKeys` query key factory for multi-workspace queries

## Edge Function Changes
- `slack-policy-notification/index.ts`:
  - Updated to read from `policy_post_channels` JSONB
  - Filters channels by `integration_id` to only post to channels for the current workspace

## UI Changes (Backward Compatible)
- `SlackIntegrationCard.tsx`:
  - Updated channel selection to use new `PolicyPostChannel` format
  - Still uses single integration (first active) for UI simplicity
  - Ready for multi-workspace UI expansion

## What's Ready vs Remaining
**Ready**:
- Database schema for multi-workspace
- All service/hook infrastructure
- Edge function handles multi-workspace channels correctly
- Existing UI works with new schema (single workspace mode)

**Remaining for Full Multi-Workspace UI**:
- Update SlackIntegrationCard to show list of workspaces
- Add "Connect Another Workspace" button
- Update channel selection to group by workspace
- Update Messages page sidebar to show workspaces

## Query Keys Updated
```typescript
slackKeys.integrations(imoId)     // All integrations for IMO
slackKeys.integration(integrationId)  // Single integration by ID
slackKeys.channels(integrationId) // Channels for specific integration
slackKeys.allChannels(imoId)      // All channels across workspaces
```
