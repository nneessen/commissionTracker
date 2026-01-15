# Code Review Prompt: Hierarchy & AP Calculation System

Copy everything below this line and provide it to your reviewer:

---

## Context

I'm building an insurance agency management system with MLM-style hierarchy. I need you to review the hierarchy and AP (Annual Premium) calculation logic to ensure it's correct across the entire codebase.

## Tech Stack
- **Frontend**: React 19, TypeScript, TanStack Query, TanStack Router
- **Backend**: Supabase (PostgreSQL), Row Level Security (RLS)

---

## FILES TO REVIEW

### SQL Migrations (Most Critical - this is where the bug pattern exists)

```
supabase/migrations/20260106_005_org_metrics_date_range.sql      ← MAIN FILE - contains most RPC functions
supabase/migrations/20260115_001_fix_agency_metrics_hierarchy.sql ← Recent fix for get_agency_dashboard_metrics
supabase/migrations/20260106_006_fix_org_metrics_date_filter.sql
supabase/migrations/20260106_004_fix_daily_production_timezone.sql
supabase/migrations/20260105_001_fix_leaderboard_names.sql
```

### Service Layer (TypeScript - calls the RPCs)

```
src/services/agency/AgencyService.ts           ← Agency dashboard metrics
src/services/imo/ImoService.ts                 ← IMO-level metrics
src/services/hierarchy/hierarchyService.ts     ← Hierarchy tree operations
src/services/hierarchy/HierarchyRepository.ts  ← Database queries for hierarchy
src/services/hierarchy/invitationService.ts    ← User invitation flow (agency_id assignment)
src/services/hierarchy/InvitationRepository.ts
src/services/overrides/overrideService.ts      ← Override commission calculations
src/services/overrides/OverrideRepository.ts
```

### Hooks (React Query - data fetching)

```
src/hooks/imo/useImoQueries.ts                 ← useAgencyDashboardMetrics, useImoProductionByAgency, etc.
src/hooks/hierarchy/useMyDownlines.ts
src/hooks/hierarchy/useDownlinePerformance.ts
src/hooks/hierarchy/useAllDownlinePerformance.ts
src/hooks/hierarchy/useHierarchyTree.ts
src/hooks/hierarchy/useMyHierarchyStats.ts
src/hooks/overrides/useOverridesByDownline.ts
src/hooks/overrides/useMyOverrideSummary.ts
```

### Dashboard Components (UI that displays the metrics)

```
src/features/dashboard/components/OrgMetricsSection.tsx    ← Shows agency/IMO metrics
src/features/dashboard/components/TeamRecruitingSection.tsx
src/features/dashboard/components/PerformanceMetrics.tsx
src/features/dashboard/DashboardHome.tsx
```

### Hierarchy Feature (Team management UI)

```
src/features/hierarchy/HierarchyDashboardCompact.tsx
src/features/hierarchy/AgentDetailPage.tsx
src/features/hierarchy/components/TeamMetricsCard.tsx
src/features/hierarchy/components/DownlinePerformance.tsx
```

---

## Business Requirements

### Two Hierarchies Exist

**1. Agency Hierarchy** (organizational structure via `agencies.parent_agency_id`):
```
Self Made Financial (top-level)
├── The Standard (child agency)
├── Ten Toes Down (child agency)
└── 1 of 1 Financial (child agency)
```

**2. User Hierarchy** (MLM upline/downline via `user_profiles.upline_id` and `hierarchy_path`):
```
Kerry (Self Made owner)
└── Nick (The Standard owner, reports to Kerry)
    ├── Hunter (reports to Nick)
    │   └── Nick2 (reports to Hunter)  ← Level 2 downline
    └── James (reports to Nick)
```

### Critical Rule: Team = Hierarchy Tree

When calculating an agency's "team production" (AP, commissions, agent count, etc.):
- **Team membership is defined by USER HIERARCHY (`hierarchy_path`), NOT `agency_id`**
- An agency owner's "team" = themselves + ALL users in their downline tree (unlimited depth)
- This is MLM-style: if someone is below you in the tree, their production counts as your team's production

### The `hierarchy_path` Field

This is a dot-separated string of UUIDs representing the path from root to user:
```
Kerry:   "kerry_uuid"
Nick:    "kerry_uuid.nick_uuid"
Hunter:  "kerry_uuid.nick_uuid.hunter_uuid"
Nick2:   "kerry_uuid.nick_uuid.hunter_uuid.nick2_uuid"
```

To find all descendants of a user:
```sql
WHERE hierarchy_path LIKE 'user_path' || '.%'
```

---

## THE BUG PATTERN TO FIND

### Wrong (Flat agency_id lookup):
```sql
-- This misses nested downlines who may have NULL or different agency_id
SELECT SUM(p.annual_premium)
FROM policies p
JOIN user_profiles up ON p.user_id = up.id
WHERE up.agency_id = target_agency_id;
```

### Correct (Hierarchy-based lookup):
```sql
WITH team_members AS (
  SELECT up.id
  FROM user_profiles up
  WHERE up.approval_status = 'approved'
    AND up.archived_at IS NULL
    AND (
      up.id = owner_id
      OR up.hierarchy_path LIKE owner_hierarchy_path || '.%'
    )
)
SELECT SUM(p.annual_premium)
FROM policies p
WHERE p.user_id IN (SELECT id FROM team_members);
```

---

## SPECIFIC FUNCTIONS TO CHECK

In `supabase/migrations/20260106_005_org_metrics_date_range.sql`, review these functions:

| Function Name | Line ~# | What It Does | Likely Buggy? |
|--------------|---------|--------------|---------------|
| `get_imo_dashboard_metrics` | ~10-105 | IMO-level totals | Maybe OK (uses imo_id) |
| `get_agency_dashboard_metrics` | ~120-260 | Agency team totals | FIXED in 20260115_001 |
| `get_imo_production_by_agency` | ~275-380 | Production breakdown by agency | CHECK - may use agency_id |
| `get_imo_override_summary` | ~395-470 | Override totals for IMO | CHECK |
| `get_agency_override_summary` | ~480-590 | Override totals for agency | CHECK - may use agency_id |

Also search for any functions matching:
- `get_agency_*`
- `get_team_*`
- `*_by_agent`
- `*_recruiting_summary`
- `*_leaderboard`
- `*_scoreboard`

---

## Database Schema Reference

```sql
-- Agencies
agencies (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID REFERENCES user_profiles(id),
  parent_agency_id UUID REFERENCES agencies(id),  -- NULL = top-level
  imo_id UUID,
  is_active BOOLEAN
)

-- Users
user_profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  agency_id UUID REFERENCES agencies(id),        -- Organizational assignment (CAN BE NULL!)
  upline_id UUID REFERENCES user_profiles(id),   -- Direct upline
  hierarchy_path TEXT,                            -- Full ancestry path (dot-separated UUIDs)
  approval_status TEXT,
  archived_at TIMESTAMPTZ
)

-- Policies (production)
policies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  annual_premium NUMERIC,
  status TEXT,  -- 'active', 'pending', 'lapsed', etc.
  effective_date DATE
)

-- Override Commissions (upline earnings from downline production)
override_commissions (
  id UUID PRIMARY KEY,
  policy_id UUID,
  base_agent_id UUID,      -- Who wrote the policy
  override_agent_id UUID,  -- Who gets the override (upline)
  override_commission_amount NUMERIC,
  agency_id UUID
)
```

---

## EXAMPLE OF CORRECT IMPLEMENTATION

This is the fixed `get_agency_dashboard_metrics` function (in `20260115_001_fix_agency_metrics_hierarchy.sql`):

```sql
CREATE OR REPLACE FUNCTION get_agency_dashboard_metrics(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_owner_id uuid;
  v_owner_hierarchy_path text;
BEGIN
  -- Get target agency
  v_agency_id := COALESCE(p_agency_id, get_my_agency_id());

  -- Get owner and their hierarchy path
  SELECT a.owner_id INTO v_owner_id FROM agencies a WHERE a.id = v_agency_id;
  SELECT COALESCE(up.hierarchy_path, up.id::text) INTO v_owner_hierarchy_path
  FROM user_profiles up WHERE up.id = v_owner_id;

  RETURN QUERY
  WITH team_members AS (
    -- CORRECT: Use hierarchy_path for team membership, NOT agency_id
    SELECT up.id
    FROM user_profiles up
    WHERE up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = v_owner_id
        OR up.hierarchy_path LIKE v_owner_hierarchy_path || '.%'
      )
  )
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    ...
  FROM agencies a
  LEFT JOIN LATERAL (
    SELECT SUM(p.annual_premium) as total_ap
    FROM policies p
    WHERE p.user_id IN (SELECT id FROM team_members)  -- Uses hierarchy!
      AND p.status = 'active'
  ) policy_stats ON true
  WHERE a.id = v_agency_id;
END;
$$;
```

---

## KNOWN DATA ISSUE

User `nick@nickneessen.com` has `agency_id = NULL` but should have inherited The Standard's agency_id from their upline (Hunter). This is a symptom of the invitation flow not properly setting agency_id.

Check `src/services/hierarchy/invitationService.ts` for where new users are created and ensure they inherit `agency_id` from their upline.

---

## DELIVERABLES EXPECTED

1. **List of functions** that have the wrong pattern (flat `agency_id` instead of `hierarchy_path`)
2. **File path and line numbers** for each issue
3. **Recommended fix** for each (can reference the correct pattern above)
4. **Any other places** in the codebase using flat agency_id lookups for team calculations
5. **Invitation flow fix** if agency_id inheritance is broken

---

## HOW TO TEST

Run this query to verify team membership for The Standard agency:

```sql
WITH owner_info AS (
  SELECT a.owner_id, COALESCE(up.hierarchy_path, up.id::text) as owner_path
  FROM agencies a
  JOIN user_profiles up ON a.owner_id = up.id
  WHERE a.name = 'The Standard'
)
SELECT up.email, up.agency_id, up.hierarchy_path
FROM user_profiles up, owner_info oi
WHERE up.id = oi.owner_id
   OR up.hierarchy_path LIKE oi.owner_path || '.%'
ORDER BY up.hierarchy_path;
```

This should return ALL users in Nick's downline tree, regardless of their `agency_id` value.
