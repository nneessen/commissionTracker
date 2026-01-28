# Slack Policy Notification Routing Logic

## Overview

When a policy is created, the system posts notifications to Slack workspaces based on the agent's agency hierarchy. This document explains how routing works for different scenarios.

## Current Configuration

### Agencies (Hierarchy)

```
Self Made Financial (ROOT - no parent)
├── The Standard
├── The Dynasty Group
├── Ten Toes Down
└── 1 of 1 Financial
```

### Slack Workspaces

| Workspace       | Linked Agency       | Type                                          |
| --------------- | ------------------- | --------------------------------------------- |
| 💎 SELF MADE 💎 | Self Made Financial | Agency-Specific (depth varies)                |
| The Standard    | The Standard        | Agency-Specific (depth=0 for Standard agents) |

---

## Routing Scenarios

### Scenario 1: Agent in "The Standard" Agency ✅

**Agent:** nickneessen@thestandardhq.com
**Agency:** The Standard (parent: Self Made Financial)

**What happens:**

1. `get_agency_hierarchy("The Standard")` returns:
   - The Standard (depth=0)
   - Self Made Financial (depth=1)
2. System finds Slack integrations for each agency:
   - "The Standard" workspace → depth=0 → **WITH leaderboard**
   - "💎 SELF MADE 💎" workspace → depth=1 → **NO leaderboard**

**Result:** Policy posts to BOTH workspaces

- The Standard: Policy + Leaderboard
- Self Made: Policy only

---

### Scenario 2: Agent in "The Dynasty Group" Agency ⚠️

**Agent:** someone@dynastygroup.com
**Agency:** The Dynasty Group (parent: Self Made Financial)

**What happens:**

1. `get_agency_hierarchy("The Dynasty Group")` returns:
   - The Dynasty Group (depth=0)
   - Self Made Financial (depth=1)
2. System finds Slack integrations:
   - **No workspace exists for "The Dynasty Group"** → Nothing at depth=0
   - "💎 SELF MADE 💎" workspace → depth=1 → **NO leaderboard**

**Result:** Policy posts ONLY to "💎 SELF MADE 💎"

- ❌ No leaderboard (because their direct agency has no workspace)
- The Standard workspace is NOT included (not in Dynasty's hierarchy)

**To fix:** Create a Slack workspace for Dynasty Group and set its `agency_id` to Dynasty's agency ID.

---

### Scenario 3: Agent in "Self Made Financial" Directly ✅

**Agent:** kerryglass.ffl@gmail.com
**Agency:** Self Made Financial (ROOT - no parent)

**What happens:**

1. `get_agency_hierarchy("Self Made Financial")` returns:
   - Self Made Financial (depth=0) ← only one level
2. System finds Slack integrations:
   - "💎 SELF MADE 💎" workspace → depth=0 → **WITH leaderboard**

**Result:** Policy posts to "💎 SELF MADE 💎"

- ✅ WITH leaderboard (direct agency)

---

### Scenario 4: Agent with NO Agency ⚠️

**Agent:** freelance@example.com
**Agency:** NULL (not assigned to any agency)

**What happens:**

1. Code falls back to IMO-level integration lookup (line 684-710)
2. Searches for `slack_integrations WHERE agency_id IS NULL`
3. **Currently NO integrations have agency_id = NULL**

**Result:** Policy posts to NOTHING

- Returns: `{ ok: true, skipped: true, reason: "No active integrations" }`

**To fix:** Either:

- Assign the agent to an agency, OR
- Create an IMO-level Slack integration (agency_id = NULL) as a catch-all

---

### Scenario 5: Agent with NO IMO ❌

**Agent:** broken@example.com
**IMO:** NULL (not attached to any IMO)

**What happens:**

1. Code validates required fields at line 599-610
2. Fails with: `{ ok: false, error: "Missing required fields: imoId, policyId, agentId" }`

**Result:** 400 error, nothing posted

**To fix:** Ensure all agents have an IMO assigned in their profile.

---

## Leaderboard Logic Summary

| Agent's Direct Agency | Workspace Found At | hierarchy_depth | Leaderboard? |
| --------------------- | ------------------ | --------------- | ------------ |
| The Standard          | The Standard       | 0               | ✅ YES       |
| The Standard          | Self Made          | 1               | ❌ NO        |
| Dynasty Group         | Self Made          | 1               | ❌ NO        |
| Self Made Financial   | Self Made          | 0               | ✅ YES       |
| NULL (no agency)      | None               | -               | ❌ N/A       |

**Rule:** Leaderboard only shows when `hierarchy_depth === 0` (direct agency match).

---

## Code Flow

```
Policy Created
     │
     ▼
┌─────────────────────────────────┐
│ Check: imoId, policyId, agentId │
│ present?                        │
└─────────────────────────────────┘
     │ NO → 400 Error
     │ YES
     ▼
┌─────────────────────────────────┐
│ Agent has agencyId?             │
└─────────────────────────────────┘
     │ NO → Fall back to IMO-level lookup
     │ YES
     ▼
┌─────────────────────────────────┐
│ get_agency_hierarchy(agencyId)  │
│ Returns: agent's agency + all   │
│ parent agencies up the chain    │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ get_slack_integrations_for_     │
│ agency_hierarchy(agencyId)      │
│ Returns: Slack workspaces where │
│ agency_id matches any agency    │
│ in the hierarchy                │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ For each integration:           │
│ - Post policy notification      │
│ - If depth=0: Include leaderboard│
│ - If depth>0: Skip leaderboard  │
└─────────────────────────────────┘
```

---

## Database Schema

### slack_integrations Table

```sql
agency_id UUID    -- Links to agencies.id
                  -- NULL = IMO-level (catch-all for agents without agency)
                  -- UUID = Agency-specific
```

### agencies Table

```sql
id UUID
parent_agency_id UUID  -- NULL = root agency
                       -- UUID = child of another agency
```

---

## Recommendations

1. **Every child agency should have its own Slack workspace** (or accept that their policies go to parent workspace without leaderboard)

2. **Consider keeping one IMO-level integration** (agency_id = NULL) as a catch-all for agents not assigned to any agency

3. **Ensure all agents have an IMO assigned** or the notification will fail entirely

4. **The leaderboard only appears at depth=0** - this is intentional to avoid duplicate leaderboards across hierarchy levels
