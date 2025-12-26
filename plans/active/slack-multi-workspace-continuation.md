# Slack Multi-Workspace Integration - Continuation Prompt

## The Problem I Misunderstood

Each agency has their **OWN Slack workspace** with their **OWN Slack app**:

```
FFG (IMO) ─────────────────── FFG Slack Workspace (own Slack app)
  │
  └── Self Made Financial ─── Self Made Slack Workspace (own Slack app)
        │
        └── The Standard ──── The Standard Slack Workspace (own Slack app)
```

When an agent at **The Standard** creates a policy, it posts to:
1. The Standard's Slack `#daily-sales`
2. Self Made's Slack `#daily-sales` (parent)
3. FFG's Slack `#daily-sales` (grandparent)

**Each workspace = separate Slack app = separate credentials**

## Current Architecture Problem

The current implementation uses ONE set of Slack credentials stored as Supabase secrets:
```
SLACK_CLIENT_ID (The Standard's)
SLACK_CLIENT_SECRET (The Standard's)
SLACK_SIGNING_SECRET (The Standard's)
```

This only works for The Standard. Self Made and FFG have their own Slack apps with different credentials.

## What Needs to Change

### 1. Store Slack App Credentials Per Agency

Need to store each agency's Slack app credentials in the database:

```sql
-- New table or add to slack_integrations
ALTER TABLE slack_integrations ADD COLUMN client_id TEXT;
ALTER TABLE slack_integrations ADD COLUMN client_secret_encrypted TEXT;
ALTER TABLE slack_integrations ADD COLUMN signing_secret_encrypted TEXT;
```

Or create a new table:
```sql
CREATE TABLE agency_slack_apps (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  imo_id UUID REFERENCES imos(id),
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  signing_secret_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Update OAuth Flow

The `slack-oauth-init` and `slack-oauth-callback` edge functions need to:
1. Accept `agencyId` parameter
2. Look up that agency's Slack app credentials from database
3. Use those credentials for the OAuth flow
4. Store the resulting bot token linked to that agency

### 3. Self Made's Credentials

Self Made provided:
```
client_id: 7329970181536.10191347056406
client_secret: 6786779ebdc3e9b2bfbcc2663820a29b
signing_secret: 8db91494ffc4d09ea9bf9100c6654d14
```

These need to be stored (encrypted) for Self Made's agency in the database.

## Files That Need Changes

### Edge Functions
- `supabase/functions/slack-oauth-init/index.ts` - Look up credentials by agency
- `supabase/functions/slack-oauth-callback/index.ts` - Look up credentials by agency
- `supabase/functions/slack-policy-notification/index.ts` - Already handles multi-workspace posting

### Database
- New migration to add credential storage per agency
- Encrypt and store Self Made's credentials

### Frontend
- Settings page to input Slack app credentials per agency
- Or admin flow to configure agency Slack apps

## Current Working State

### What Works
- ✅ The Standard workspace connected and receiving notifications
- ✅ Policy creation triggers Slack notification
- ✅ Simple message format: `$1,200 Carrier Product Eff Date: 12/26 AgentName`
- ✅ Daily leaderboard with 🥇🥈🥉 updates in place
- ✅ Hierarchy traversal logic (`get_agency_hierarchy()`)
- ✅ Multi-workspace posting logic in edge function (once connected)
- ✅ Emoji rendering in Slack tab

### What Doesn't Work
- ❌ Slack @mentions - `slack_member_id` not populating (email lookup failing)
- ❌ Self Made/FFG can't connect - no way to use their own Slack app credentials
- ❌ No UI to input agency Slack app credentials

## Database Tables Reference

```sql
-- slack_integrations - stores connected workspaces
-- Currently has: bot_token_encrypted, team_id, team_name, policy_channel_id, agency_id, imo_id

-- agencies - hierarchy with parent_agency_id
-- get_agency_hierarchy(agency_id) - recursive function walks up hierarchy
-- get_slack_integrations_for_agency_hierarchy(agency_id) - gets all integrations in hierarchy

-- daily_sales_logs - tracks daily leaderboard message per channel
-- app_config - stores supabase_url and service_role_key for trigger
```

## Immediate Next Steps

1. **Create migration** to store Slack app credentials per agency
2. **Update OAuth edge functions** to use agency-specific credentials
3. **Store Self Made's credentials** (encrypted) in database
4. **Have Self Made owner connect** via OAuth with their credentials
5. **Test multi-workspace posting** - create policy, verify it posts to both workspaces

## Quick Reference

```bash
# Deploy edge function
npx supabase functions deploy slack-oauth-init --no-verify-jwt
npx supabase functions deploy slack-oauth-callback --no-verify-jwt
npx supabase functions deploy slack-policy-notification --no-verify-jwt

# Apply migration
./scripts/apply-migration.sh supabase/migrations/FILENAME.sql

# Typecheck
npm run typecheck
```

## Agency IDs for Reference

```sql
-- Check agencies
SELECT id, name, parent_agency_id FROM agencies;

-- The Standard workspace integration
SELECT id, team_name, agency_id, imo_id FROM slack_integrations WHERE is_active = true;
```
