# Slack Policy Notification System - Complete Knowledge Documentation

## Executive Summary

This document provides a comprehensive A-Z breakdown of what happens when agents submit policies through the app, including Slack integration behavior across all agency hierarchy scenarios.

---

## TABLE OF CONTENTS

1. [Complete A-Z Flow: Policy Submission to Slack](#1-complete-a-z-flow)
2. [Agency Hierarchy Scenarios](#2-agency-hierarchy-scenarios)
3. [Slack Username Display Behavior](#3-slack-username-display)
4. [Leaderboard Username Attachment](#4-leaderboard-usernames)
   - 4A. [Rate Limiting & Error Handling](#4a-rate-limiting--error-handling)
5. [First Seller Naming Dialog Logic](#5-first-seller-naming-dialog)
6. [Manual Slack Posting Detection](#6-manual-posting-detection)
7. [Missing Sales Detection Capability](#7-missing-sales-detection)
8. [Multi-Level Hierarchy Posting](#8-multi-level-hierarchy)
9. [Critical Files Reference](#9-critical-files)

---

## 1. COMPLETE A-Z FLOW: Policy Submission to Slack

### Step 1: Agent Opens PolicyForm and Submits

**Location**: `/src/features/policies/PolicyForm.tsx`

- Agent fills out policy form (carrier, product, client, premium, effective date)
- Form validates input at lines 290-328
- On submit, calculates `annualPremium` and builds submission data

### Step 2: Form Data Transformation

**Location**: `/src/features/policies/utils/policyFormTransformer.ts`

- `transformFormToCreateData()` converts form → `CreatePolicyData`
- Commission percentage: 95% → 0.95 (decimal conversion)
- Monthly premium calculated from annual + payment frequency

### Step 3: useCreatePolicy Mutation

**Location**: `/src/features/policies/hooks/useCreatePolicy.ts`

- Calls `policyService.create(newPolicy)`
- On success: invalidates cache for policies, commissions, metrics

### Step 4: PolicyService Creates Policy + Commission

**Location**: `/src/services/policies/policyService.ts` (lines 63-131)

```
4a. PolicyRepository.create(policyData) → Inserts policy into Supabase
4b. CommissionService.createCommissionForPolicy() → Creates pending commission
4c. EMITS: WORKFLOW_EVENTS.POLICY_CREATED event with:
    - policyId, policyNumber, carrierId, productId
    - agentId (CRITICAL: used to determine agency_id)
    - clientName, premium, status, effectiveDate, createdAt
```

### Step 5: Slack Policy Notification Edge Function Invoked

**Location**: `/supabase/functions/slack-policy-notification/index.ts`

Triggered by workflow event or explicit call. Key decision point:

```
IS THIS THE FIRST SALE OF THE DAY FOR THIS CHANNEL?

Query: SELECT * FROM daily_sales_logs
       WHERE channel_id = X AND log_date = TODAY

If NO LOG EXISTS → FIRST SALE (go to Step 6)
If LOG EXISTS → SUBSEQUENT SALE (go to Step 7)
```

### Step 6: First Sale Handling (Pending State)

**Lines 1004-1122 in slack-policy-notification**

When it's the first sale:

1. **Creates daily_sales_logs entry**:

   ```sql
   INSERT INTO daily_sales_logs (
     imo_id, slack_integration_id, channel_id, log_date,
     first_seller_id,        -- The agent who sold first
     pending_policy_data,    -- JSONB: { policyText, carrierName, productName, agentName, ... }
     title,                  -- NULL (needs naming)
     hierarchy_depth         -- 0 for direct agency, >0 for parents
   )
   ```

2. **Does NOT post to Slack yet** - returns `{ pendingFirstSale: true }`

3. **Frontend polls for pending first sales** (PolicyDashboard.tsx lines 75-138):
   - Calls RPC `check_first_seller_naming(userId)` every 500ms (6 attempts)
   - When found, shows `FirstSellerNamingDialog`

### Step 7: First Seller Naming Dialog

**Location**: `/src/features/policies/components/FirstSellerNamingDialog.tsx`

Agent sees dialog asking to name the leaderboard:

- Can enter custom title (e.g., "Freaky Friday Sales")
- Can add prefix/suffix emojis
- Can click "Use Default Title" to skip (uses day-based title like "Monday Motivation")
- **Multi-Channel Support**: If first in multiple channels, shows "Save & Next"

On submit (lines 90-140):

1. Calls RPC `set_leaderboard_title(logId, title)` to save title
2. Calls edge function with `action: "complete-first-sale"`

### Step 8: Complete First Sale - Posts to Slack

**Location**: `/supabase/functions/slack-policy-notification/index.ts` (lines 329-485)

`handleCompleteFirstSale()`:

1. **Fetches pending data from daily_sales_logs**
2. **Looks up agent in Slack workspace** (email lookup per-workspace)
3. **Posts Policy Notification**:
   ```
   Format: "$1,200 Whole Life Whole Life Eff Date: 12/26"
   Posted as: Agent's Slack name + avatar (if found)
   ```
4. **Builds Leaderboard**:
   - Calls RPC `get_daily_production_by_agent(imo_id, agency_id)`
   - Sums today's policies per agent
   - Formats with rank emojis (🥇🥈🥉)
5. **Posts Leaderboard Message**:

   ```
   *Freaky Friday Sales*
   _Friday, Jan 3_

   🥇 <@U12345> - $15,000 (2 policies)
   🥈 Another Agent - $10,000 (1 policy)

   *Total: $25,000*
   ```

6. **Saves leaderboard_message_ts** for future updates
7. **Clears pending_policy_data**

### Step 9: Subsequent Sales

**Lines 1124-1212 in slack-policy-notification**

When daily_sales_logs already exists:

1. **Posts Policy Notification** immediately
2. **Deletes Old Leaderboard** (uses stored message_ts)
3. **Posts Fresh Leaderboard** with updated production data
4. **Updates message_ts** in database

---

## 2. AGENCY HIERARCHY SCENARIOS

### How Hierarchy is Determined

**Database Function**: `get_slack_integrations_for_agency_hierarchy(p_agency_id)`

This function walks UP the hierarchy using `parent_agency_id` and returns ALL Slack integrations in the chain, ordered by `hierarchy_depth`.

```
depth = 0  → Agent's direct agency
depth = 1  → Parent agency
depth = 2  → Grandparent agency
depth = 999 → IMO-level (agency_id IS NULL)
```

**Key Rule**: Only `depth = 0` gets the leaderboard. All others get policy-only notifications.

---

### Scenario A: Agent NOT Assigned to Any Agency

**Condition**: `user_profiles.agency_id = NULL`

**What Happens**:

1. Query falls back to IMO-level integrations: `WHERE agency_id IS NULL`
2. Posts to IMO-level Slack workspace only
3. `hierarchy_depth = 999` → **NO leaderboard included**
4. Agent appears in IMO-wide leaderboard (if manually triggered)

**Result**: Policy notification posted, but no daily leaderboard attached.

---

### Scenario B: Agent Assigned to Primary (Root) Agency

**Condition**: `user_profiles.agency_id = "agency-a"` where Agency A has `parent_agency_id = NULL`

**What Happens**:

1. `get_slack_integrations_for_agency_hierarchy("agency-a")` returns:
   - Agency A integration (depth=0)
   - IMO-level integration if exists (depth=999)
2. **Agency A workspace**: Policy + Leaderboard (depth=0)
3. **IMO workspace**: Policy only (depth=999)

**Result**: Agent's policy appears in Agency A's leaderboard.

---

### Scenario C: Agent in Child Agency (Agency B → Agency A)

**Condition**: Agent in Agency B, where `Agency B.parent_agency_id = Agency A`

**Hierarchy**:

```
Agency A (root, parent=NULL)
  └── Agency B (child, parent=Agency A) ← Agent is here
```

**What Happens**:

1. Query returns:
   - Agency B integration (depth=0) - **WITH leaderboard**
   - Agency A integration (depth=1) - policy only
   - IMO integration (depth=999) - policy only
2. Policy posted to ALL workspaces in hierarchy
3. **Only Agency B gets the leaderboard**

**Result**: Policy appears in Agency B's leaderboard. Agency A sees policy only.

---

### Scenario D: Agent in Deep Hierarchy (Agency C → Agency B → Agency A)

**Condition**: Agent in Agency C, three levels deep

**Hierarchy**:

```
Agency A (root)
  └── Agency B
      └── Agency C ← Agent is here
```

**What Happens**:

1. Query returns:
   - Agency C integration (depth=0) - **WITH leaderboard**
   - Agency B integration (depth=1) - policy only
   - Agency A integration (depth=2) - policy only
   - IMO integration (depth=999) - policy only
2. **Policy posted to ALL levels** (C, B, A, IMO)
3. **Leaderboard ONLY at Agency C** (depth=0)

**IMPORTANT CLARIFICATION**: Contrary to your assumption, Agency B DOES receive the policy notification. The hierarchy walks UP, posting to every level. The only difference is whether the leaderboard is included (only at depth=0).

---

## 3. SLACK USERNAME DISPLAY

### Individual Policy Messages

**YES** - Agent's Slack username and avatar appear.

**How it works** (lines 164-197 in slack-policy-notification):

```typescript
// Per-workspace lookup
const slackUser = await lookupSlackMemberByEmail(botToken, agentEmail);

// Post with agent's identity
postSlackMessage(botToken, channelId, policyText, {
  username: slackUser.displayName, // e.g., "John Smith"
  icon_url: slackUser.avatarUrl, // Their Slack profile picture
});
```

**Fallback**: If agent not found in Slack workspace, posts with generic bot name.

**Per-Workspace**: Same agent has different Slack IDs in different workspaces. Lookup happens separately for each workspace.

---

## 4. LEADERBOARD USERNAMES

### Per-Workspace Member Lookup

**YES** - Agent names appear, with @mention capability via per-workspace lookup.

**Important Architecture Note**: The `slack_member_id` stored in `user_slack_preferences` is per-IMO, NOT per-workspace. Since one IMO can have multiple Slack workspaces connected, using stored IDs would cause "private user info" errors when posting to workspaces where that member ID doesn't exist.

**Solution**: The `slack-refresh-leaderboard` function looks up each agent in the CURRENT workspace before building the leaderboard:

```typescript
// Step 1: Look up all agents in the current workspace by email
const memberMap = await lookupAllSlackMembers(botToken, production);

// Step 2: For each leaderboard entry, use the workspace-specific member ID
const slackMemberId = memberMap.get(entry.agent_id);
const nameDisplay = slackMemberId
  ? `<@${slackMemberId}>` // @mention (workspace-specific)
  : entry.agent_name?.trim() || // Fallback to full name
    entry.agent_email?.split("@")[0] ||
    "Unknown";
```

**Lookup Function** (in `slack-refresh-leaderboard/index.ts`):

```typescript
async function lookupSlackMemberByEmail(
  botToken: string,
  email: string,
): Promise<string | null> {
  const response = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${botToken}` } },
  );
  const data = await response.json();
  return data.ok ? data.user.id : null;
}
```

**Result**:

- If agent exists in workspace: `🥇 <@U12345> - $15,000 (2 policies)` (clickable @mention)
- If agent NOT in workspace: `🥇 John Smith - $15,000 (2 policies)` (plain text fallback)

### Name Fallback Chain

If the Slack lookup fails, the system uses this fallback chain:

1. `entry.agent_name?.trim()` - Full name from user_profiles
2. `entry.agent_email?.split('@')[0]` - Email username portion
3. `'Unknown'` - Final fallback

### SQL NULL Handling Fix

**Migration**: `20260105_001_fix_leaderboard_names.sql`

The `get_daily_production_by_agent` function now properly handles NULL first/last names:

```sql
-- Old (buggy): NULL + ' ' + 'Smith' = NULL (entire concatenation becomes NULL)
COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name

-- New (fixed): Handles NULL components individually
COALESCE(
  NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
  up.email,
  'Unknown'
) as agent_name
```

---

## 4A. RATE LIMITING & ERROR HANDLING

### Slack API Rate Limits

The `users.lookupByEmail` API is rate-limited to approximately 20 requests per minute. To respect this limit:

**Sequential Lookups**: Member lookups are performed sequentially (not in parallel):

```typescript
// In lookupAllSlackMembers():
for (const entry of entries) {
  const memberId = await lookupSlackMemberByEmail(botToken, entry.agent_email);
  memberMap.set(entry.agent_id, memberId);
}
```

This ensures we don't trigger rate limiting even with 10+ agents on the leaderboard.

### Error Handling Strategy

The `lookupSlackMemberByEmail` function handles different error types appropriately:

| Error Type                                         | Handling                         | Retry?                      |
| -------------------------------------------------- | -------------------------------- | --------------------------- |
| `users_not_found`                                  | Expected - user not in workspace | No - return null silently   |
| `ratelimited`                                      | Wait for `Retry-After` header    | Yes - up to 2 retries       |
| `invalid_auth` / `token_revoked` / `token_expired` | Log as error                     | No - indicates config issue |
| Network error                                      | Transient failure                | Yes - 1 retry after 500ms   |
| Other Slack errors                                 | Log warning                      | No - return null            |

**Implementation**:

```typescript
async function lookupSlackMemberByEmail(
  botToken: string,
  email: string,
  retryCount: number = 0,
): Promise<string | null> {
  const MAX_RETRIES = 2;

  try {
    const response = await fetch(/* ... */);
    const data = await response.json();

    if (!data.ok) {
      switch (data.error) {
        case "users_not_found":
          return null; // Expected, no logging

        case "ratelimited":
          if (retryCount < MAX_RETRIES) {
            const retryAfter = parseInt(
              response.headers.get("Retry-After") || "1",
              10,
            );
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            return lookupSlackMemberByEmail(botToken, email, retryCount + 1);
          }
          return null;

        case "invalid_auth":
        case "token_revoked":
        case "token_expired":
          console.error(`Slack auth error: ${data.error}`);
          return null;

        default:
          console.warn(`Slack API error for ${email}: ${data.error}`);
          return null;
      }
    }
    return data.user?.id || null;
  } catch (err) {
    // Network error - retry once
    if (retryCount < 1) {
      await new Promise((r) => setTimeout(r, 500));
      return lookupSlackMemberByEmail(botToken, email, retryCount + 1);
    }
    return null;
  }
}
```

### Leaderboard Settings Check

The `slack-daily-leaderboard` function now respects the `include_leaderboard_with_policy` setting:

```typescript
// After checking if leaderboard channel is configured
if (integration.include_leaderboard_with_policy === false) {
  console.log(
    "[slack-daily-leaderboard] Leaderboard posting disabled in settings",
  );
  return new Response(
    JSON.stringify({
      ok: true,
      skipped: true,
      reason: "Leaderboard posting disabled",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
```

This check occurs at line ~202 in `slack-daily-leaderboard/index.ts`.

---

## 5. FIRST SELLER NAMING DIALOG

### Who Gets the Dialog?

The **first agent to sell a policy for a specific channel on a specific day**.

**Key Logic**:

- Checked per `(slack_integration_id, channel_id, log_date)` combination
- Each agency's Slack channel has its own "first seller"
- Multi-channel: If agent is first in multiple channels, dialog appears for each

### Multi-Level First Seller Example

**Scenario**: Agent in Agency B (child of Agency A) sells the first policy of the day.

**What Happens**:

1. Agent is first for **Agency B's channel** (depth=0)
2. Agent is first for **Agency A's channel** (depth=1)
3. Both logs created with `pending_policy_data`

**BUT**: Only depth=0 entries include leaderboard naming (checked in edge function).

**Dialog Behavior**:

- `check_first_seller_naming()` returns ALL pending logs for this user
- Dialog shows for Agency B (with leaderboard naming)
- Dialog may show for Agency A (but leaderboard not included at that level)

**Current Implementation** (Migration 20260105_003):

- Returns all logs where `first_seller_id = user_id AND (title IS NULL OR pending_policy_data IS NOT NULL)`
- Each log has `hierarchy_depth` - UI could filter to only show depth=0

---

## 6. MANUAL POSTING DETECTION

### Current State: NOT IMPLEMENTED

**Q: Can the system detect manually posted messages?**
**A: NO**

**What Exists**:

- `slack_messages` table records ONLY app-posted messages
- Messages tracked with: `channel_id`, `message_ts`, `notification_type`, `status`
- No listener for Slack Events API

**What Would Be Needed**:

1. Subscribe to Slack Events API (`message.channels` event)
2. Distinguish `bot_id` presence (app-posted) vs regular user messages
3. Parse message content to extract policy data
4. Cross-reference with policies table

**Gap**: System is one-way (app → Slack). No reverse channel.

---

## 7. MISSING SALES DETECTION

### Current State: NOT IMPLEMENTED

**Q: Can the system figure out which sales are missing from the leaderboard?**
**A: NO**

**Why**:

1. No Slack → App data flow
2. Leaderboard is built from `policies` table only
3. Manually posted sales in Slack don't create `policies` records
4. No reconciliation mechanism exists

**To Implement This Would Require**:

1. Listen to Slack messages (Events API)
2. Parse message format to extract: amount, carrier, product, agent
3. Match against policies table
4. Report discrepancies

**Alternative**: The system only tracks what's in the database. If sales aren't entered in the app, they don't exist to the system.

---

## 8. MULTI-LEVEL HIERARCHY POSTING

### Your Question Clarified

**Q**: "Agent in Agency C sells first policy. Does this post to Agency B?"
**A**: **YES**, it posts to Agency B (and Agency A, and IMO if configured).

**However**: Only Agency C (depth=0) gets the leaderboard. Agency B and A get policy-only.

### Complete Posting Matrix

| Agent Location    | Agency C Slack | Agency B Slack | Agency A Slack | IMO Slack     |
| ----------------- | -------------- | -------------- | -------------- | ------------- |
| Agent in C        | Policy + LB ✓  | Policy only ✓  | Policy only ✓  | Policy only ✓ |
| Agent in B        | ❌             | Policy + LB ✓  | Policy only ✓  | Policy only ✓ |
| Agent in A        | ❌             | ❌             | Policy + LB ✓  | Policy only ✓ |
| Agent (no agency) | ❌             | ❌             | ❌             | Policy only ✓ |

**LB** = Leaderboard included

### First Seller Naming in Child Agencies

**Scenario**: Agent in Agency B (parent = Agency A) sells first policy of day.

**Does agent get naming dialog?** **YES** - for Agency B's channel.

**Reasoning**:

1. Policy triggers `slack-policy-notification`
2. Checks `daily_sales_logs WHERE channel_id = [Agency B's channel]` → No log
3. Creates pending log for Agency B with `hierarchy_depth = 0`
4. Agent is prompted to name Agency B's leaderboard
5. Agency A channel gets policy-only (no naming prompt for parent levels)

---

## 9. CRITICAL FILES REFERENCE

### Frontend

| File                                                           | Purpose                             |
| -------------------------------------------------------------- | ----------------------------------- |
| `src/features/policies/PolicyDashboard.tsx`                    | Orchestrates form, polling, dialogs |
| `src/features/policies/PolicyForm.tsx`                         | Policy input form                   |
| `src/features/policies/components/FirstSellerNamingDialog.tsx` | Leaderboard naming UI               |
| `src/features/policies/hooks/useCreatePolicy.ts`               | Policy creation mutation            |

### Backend Services

| File                                                | Purpose                      |
| --------------------------------------------------- | ---------------------------- |
| `src/services/policies/policyService.ts`            | Policy CRUD + event emission |
| `src/services/slack/slackService.ts`                | Slack integration management |
| `src/services/slack/userSlackPreferencesService.ts` | Per-user Slack settings      |

### Edge Functions

| File                                                    | Purpose                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `supabase/functions/slack-policy-notification/index.ts` | **CORE**: First sale detection, policy posting, leaderboard building |
| `supabase/functions/slack-daily-leaderboard/index.ts`   | Manual leaderboard posting (respects settings toggle)                |
| `supabase/functions/slack-refresh-leaderboard/index.ts` | Updates existing leaderboard with per-workspace member lookup        |

### Database Migrations

| File                                        | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `20251226_004_fix_slack_trigger_config.sql` | app_config table for trigger auth        |
| `20251226_006_daily_sales_leaderboard.sql`  | daily_sales_logs table, production RPC   |
| `20251226_012_first_seller_naming_rpc.sql`  | set_leaderboard_title RPC                |
| `20260105_001_fix_leaderboard_names.sql`    | NULL name handling fix in production RPC |
| `20260105_003_multi_channel_naming.sql`     | Multi-channel naming support             |

### Revert Migrations

| File                                             | Purpose                         |
| ------------------------------------------------ | ------------------------------- |
| `reverts/20260105_001_fix_leaderboard_names.sql` | Rollback NULL name handling fix |

### Key RPC Functions

| Function                                                 | Purpose                                  |
| -------------------------------------------------------- | ---------------------------------------- |
| `get_agency_hierarchy(agency_id)`                        | Returns agency chain with depths         |
| `get_slack_integrations_for_agency_hierarchy(agency_id)` | Returns Slack integrations for hierarchy |
| `get_daily_production_by_agent(imo_id, agency_id)`       | Builds leaderboard data                  |
| `check_first_seller_naming(user_id)`                     | Finds pending naming dialogs             |
| `set_leaderboard_title(log_id, title)`                   | Sets leaderboard title                   |

---

## SUMMARY OF ANSWERS

| Question                                  | Answer                                             |
| ----------------------------------------- | -------------------------------------------------- |
| Agent Slack username on policy posts?     | **YES** - looked up per-workspace by email         |
| Leaderboard shows agent usernames?        | **YES** - per-workspace lookup, fallback to name   |
| Manual Slack posts detected?              | **NO** - not implemented                           |
| Missing sales detection?                  | **NO** - not implemented                           |
| First seller in child agency gets dialog? | **YES** - for their agency's channel               |
| Child agency policy posts to parent?      | **YES** - policy only (no leaderboard)             |
| Leaderboard respects settings toggle?     | **YES** - checks `include_leaderboard_with_policy` |

---

## GAPS / LIMITATIONS IDENTIFIED

1. **No Slack → App data flow**: Manual posts are invisible to system
2. **No reconciliation**: Can't detect discrepancies between Slack and database
3. **Leaderboard only at depth=0**: Parent agencies don't get hierarchical leaderboards

### Previously Fixed Issues

| Issue                                    | Fix Date   | Solution                                                       |
| ---------------------------------------- | ---------- | -------------------------------------------------------------- |
| "Private user info" on leaderboard names | 2026-01-05 | Per-workspace member lookup via `users.lookupByEmail` API      |
| Leaderboard posting ignoring settings    | 2026-01-05 | Added `include_leaderboard_with_policy` check in edge function |
| NULL name concatenation bug              | 2026-01-05 | Fixed SQL with proper COALESCE handling                        |
| Policy trigger auth failures             | 2026-01-05 | Updated `app_config.supabase_service_role_key`                 |
