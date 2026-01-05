# Continuation Prompt: Update Slack Policy Notification Documentation

## Context

The file `docs/slack-policy-notification-system.md` needs to be updated to reflect recent fixes to the Slack integration system. The documentation is currently outdated in several key areas.

## Changes That Need to Be Documented

### 1. Leaderboard Username Lookup (MAJOR CHANGE)

**Old behavior (documented in Section 4)**:
```typescript
// Used stored slack_member_id from user_slack_preferences
const nameDisplay = entry.slack_member_id
  ? `<@${entry.slack_member_id}>`
  : entry.agent_name
```

**New behavior**:
- The `slack_member_id` stored in `user_slack_preferences` is per-IMO, NOT per-workspace
- This caused "private user info" errors when posting to workspaces where the stored ID didn't exist
- **FIX**: Now uses Slack's `users.lookupByEmail` API to look up each agent in the CURRENT workspace before building the leaderboard
- Falls back to agent name only if the user doesn't exist in that workspace

**File changed**: `supabase/functions/slack-refresh-leaderboard/index.ts`
- Added `lookupSlackMemberByEmail()` function with retry logic
- Added `lookupAllSlackMembers()` function (sequential, not parallel for rate limiting)
- Modified `buildLeaderboardText()` to accept `memberMap` parameter

### 2. Leaderboard Settings Check (NEW)

**Old behavior**:
- `slack-daily-leaderboard` only checked if `leaderboard_channel_id` was configured
- Ignored the `include_leaderboard_with_policy` toggle

**New behavior**:
- Now checks `integration.include_leaderboard_with_policy === false` and skips posting if disabled

**File changed**: `supabase/functions/slack-daily-leaderboard/index.ts` (around line 202)

### 3. Rate Limiting & Error Handling (NEW)

**New behavior in `slack-refresh-leaderboard`**:
- Sequential API calls (not parallel) to respect Slack rate limits (~20 req/min)
- Proper error differentiation:
  - `users_not_found` → expected, return null silently
  - `ratelimited` → wait for Retry-After header, retry up to 2 times
  - `invalid_auth`/`token_revoked`/`token_expired` → log as error
  - Network errors → retry once after 500ms

### 4. NULL Name Handling in SQL (BUG FIX)

**Old SQL**:
```sql
COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name
```
- Bug: If `first_name` OR `last_name` is NULL, entire concatenation is NULL

**New SQL** (in `get_daily_production_by_agent`):
```sql
COALESCE(
  NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
  up.email,
  'Unknown'
) as agent_name
```

**Migration**: `supabase/migrations/20260105_001_fix_leaderboard_names.sql`

### 5. Policy Posting Trigger Configuration

**Issue found**: The `app_config` table had an old, invalid `supabase_service_role_key`, preventing the database trigger from calling the edge function.

**Fix**: Updated the key in `app_config` and modified the migration to use `ON CONFLICT DO NOTHING` instead of overwriting.

---

## Sections to Update in the Documentation

1. **Section 4: LEADERBOARD USERNAMES** - Rewrite to explain per-workspace lookup
2. **Section 3: SLACK USERNAME DISPLAY** - May need minor updates
3. **Section 9: CRITICAL FILES REFERENCE** - Add new migration file
4. **New Section Needed**: Rate Limiting & Error Handling
5. **GAPS / LIMITATIONS** - Update to reflect what's now fixed

---

## Task

Update `docs/slack-policy-notification-system.md` to accurately reflect the current implementation. Focus on:

1. Explaining the per-workspace member lookup in Section 4
2. Adding information about the settings check for leaderboard posting
3. Documenting the rate limiting and retry logic
4. Updating the SQL description for NULL name handling
5. Adding the new migration file to the reference tables
6. Removing any gaps that have been fixed

Keep the document structure intact but update the content for accuracy.
