# Team Hub Dashboard Section Implementation Plan

**Status:** TODO - On Standby
**Created:** 2024-12-14

## Overview
Add a new "Team Hub" section to the dashboard featuring:
1. **Team Leaderboard** - Org-wide rankings with 4 metrics
2. **Slack Integration** - Full OAuth with channel browsing/messaging
3. **Downline Overview** - Quick stats for agents with direct reports

## User Requirements
- Full OAuth for Slack (like email system)
- All 4 metrics: Premium Written, Policies Sold, Commission Earned, Persistency Rate
- Org-wide visibility (admins see all details, agents see rankings)
- No hardcoded values - all from database/API
- Super admin gets full capabilities

---

## Phase 1: Database Schema

### New Tables (Migration: `YYYYMMDD_001_team_hub_slack_integration.sql`)

```sql
-- Slack workspace config (org-level, admin-managed)
CREATE TABLE slack_workspace_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL UNIQUE,
  workspace_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  bot_user_id TEXT,
  scopes TEXT[] DEFAULT '{}',
  installed_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Channel subscriptions
CREATE TABLE slack_channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspace_config(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_type TEXT CHECK (channel_type IN ('public', 'private', 'dm')),
  subscription_type TEXT DEFAULT 'notifications',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, channel_id)
);

-- Cached messages for display
CREATE TABLE slack_messages_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspace_config(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL UNIQUE,
  user_id TEXT,
  user_name TEXT,
  text TEXT,
  thread_ts TEXT,
  attachments JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '[]',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard cache (performance optimization)
CREATE TABLE team_leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('mtd', 'ytd', 'all_time')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  rankings JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_type, period_start, period_end)
);
```

---

## Phase 2: File Structure

```
src/features/team-hub/
├── index.ts
├── TeamHubPanel.tsx                    # Main dashboard panel component
│
├── components/
│   ├── TeamLeaderboard.tsx             # Leaderboard with all 4 metrics
│   ├── LeaderboardTable.tsx            # Rankings table (role-based visibility)
│   ├── LeaderboardFilters.tsx          # MTD/YTD/All Time toggle
│   ├── MetricRankCard.tsx              # Individual metric rank display
│   ├── DownlineOverview.tsx            # Direct reports stats
│   ├── DownlineMiniTable.tsx           # Top performers table
│   ├── SlackIntegrationCard.tsx        # Connection status + settings
│   ├── SlackChannelPicker.tsx          # Channel selection
│   ├── SlackMessageFeed.tsx            # Messages display
│   └── SlackOAuthButton.tsx            # OAuth button
│
├── hooks/
│   ├── useTeamLeaderboard.ts
│   ├── useDownlineOverview.ts
│   ├── useSlackConnection.ts
│   ├── useSlackChannels.ts
│   └── useSlackMessages.ts
│
├── services/
│   ├── teamLeaderboardService.ts
│   ├── downlineOverviewService.ts
│   └── slackConnectionService.ts
│
└── types/
    └── team-hub.types.ts
```

---

## Phase 3: Edge Functions

```
supabase/functions/
├── slack-oauth-callback/index.ts    # OAuth redirect handler
├── slack-list-channels/index.ts     # Fetch available channels
├── slack-fetch-messages/index.ts    # Fetch channel messages
└── compute-leaderboard/index.ts     # Compute and cache rankings
```

**Required Supabase Secrets:**
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_REDIRECT_URI`

---

## Phase 4: Component Hierarchy

```
TeamHubPanel (dashboard section)
├── [If user has downlines]
│   └── DownlineOverview
│       ├── Summary stats (direct reports, policies, premium)
│       └── DownlineMiniTable (top 5 performers)
│
├── TeamLeaderboard
│   ├── LeaderboardFilters (MTD | YTD | All Time)
│   ├── MetricRankCard x4 (Premium, Policies, Commission, Persistency)
│   └── LeaderboardTable
│       ├── [Admin: full details with values]
│       └── [Agent: rank only, values hidden]
│
└── [Admin only]
    └── SlackIntegrationCard
        ├── SlackOAuthButton (if not connected)
        ├── SlackChannelPicker (if connected)
        └── SlackMessageFeed (if channel selected)
```

---

## Phase 5: Implementation Order

### Step 1: Database & Types
- [ ] Create migration file
- [ ] Run migration, regenerate `database.types.ts`
- [ ] Create `team-hub.types.ts`

### Step 2: Leaderboard (uses existing hierarchy data)
- [ ] `teamLeaderboardService.ts` - leverage `HierarchyService.getAllDownlinePerformance()`
- [ ] `useTeamLeaderboard.ts` hook
- [ ] `LeaderboardFilters.tsx`, `MetricRankCard.tsx`, `LeaderboardTable.tsx`
- [ ] `TeamLeaderboard.tsx` container

### Step 3: Downline Overview
- [ ] `downlineOverviewService.ts` - leverage existing hierarchy hooks
- [ ] `useDownlineOverview.ts` hook
- [ ] `DownlineOverview.tsx`, `DownlineMiniTable.tsx`

### Step 4: Slack Integration
- [ ] Edge function: `slack-oauth-callback`
- [ ] `slackConnectionService.ts` (follows email pattern)
- [ ] `useSlackConnection.ts` hooks
- [ ] `SlackOAuthButton.tsx`, `SlackIntegrationCard.tsx`
- [ ] Edge functions: `slack-list-channels`, `slack-fetch-messages`
- [ ] `SlackChannelPicker.tsx`, `SlackMessageFeed.tsx`

### Step 5: Integration
- [ ] `TeamHubPanel.tsx` - combine all components
- [ ] Add to `DashboardHome.tsx` below KPI Breakdown
- [ ] Add navigation permissions if needed
- [ ] Run `npm run build` - zero errors

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `src/features/dashboard/DashboardHome.tsx` | Add `<TeamHubPanel />` below KPI Breakdown |
| `src/types/database.types.ts` | Regenerate after migration |
| `supabase/functions/_shared/encryption.ts` | Reuse for Slack token encryption |

## Existing Code to Leverage

| Existing | Use For |
|----------|---------|
| `HierarchyService.getAllDownlinePerformance()` | Leaderboard metrics |
| `HierarchyService.getTeamComparison()` | Ranking calculations |
| `useMyHierarchyStats()` | Downline counts |
| `emailConnectionService.ts` pattern | Slack OAuth service |
| `oauth-callback` edge function | Slack OAuth callback |
| `_shared/encryption.ts` | Token encryption |

---

## UI Design Notes

- Compact styling: `p-3`, `text-[11px]`, `text-[10px]`
- Card-based layout matching existing dashboard
- Role-based visibility using `usePermissionCheck()`
- No nested cards
- Semantic colors only for status indicators
