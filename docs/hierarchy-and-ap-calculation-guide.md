# Hierarchy & AP Calculation Guide

## Overview

This system has **two distinct hierarchies** that work together for MLM-style insurance agency management:

1. **Agency Hierarchy** - Organizations containing agents (parent/child agencies)
2. **User Hierarchy** - Upline/downline relationships between individual agents

---

## Data Model

### Key Tables

```sql
-- Agencies (organizational units)
agencies (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID REFERENCES user_profiles(id),  -- Who owns this agency
  parent_agency_id UUID REFERENCES agencies(id), -- Parent agency (NULL = top-level)
  imo_id UUID REFERENCES imos(id),
  is_active BOOLEAN
)

-- Users/Agents
user_profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  agency_id UUID REFERENCES agencies(id),      -- Which agency they belong to
  upline_id UUID REFERENCES user_profiles(id), -- Direct upline (1 level up)
  hierarchy_path TEXT,                          -- Full path from root to user (dot-separated UUIDs)
  imo_id UUID,
  approval_status TEXT,  -- 'approved', 'pending', etc.
  archived_at TIMESTAMPTZ
)

-- Policies (production)
policies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),  -- Who wrote the policy
  annual_premium NUMERIC,                      -- AP value
  status TEXT,  -- 'active', 'pending', 'lapsed', etc.
  effective_date DATE,
  agency_id UUID,
  imo_id UUID
)
```

---

## Agency Hierarchy

### Structure
```
Self Made Financial (top-level, parent_agency_id = NULL)
├── The Standard (parent_agency_id = Self Made)
│   └── [potential sub-agencies]
├── Ten Toes Down (parent_agency_id = Self Made)
└── 1 of 1 Financial (parent_agency_id = Self Made)
```

### Querying Agency Descendants (Recursive)

```sql
-- Get an agency and all its child agencies (walks DOWN the tree)
CREATE OR REPLACE FUNCTION get_agency_descendants(p_agency_id UUID)
RETURNS TABLE(agency_id UUID, agency_name TEXT, parent_agency_id UUID, depth INT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE agency_tree AS (
    -- Base case: the starting agency
    SELECT a.id, a.name::TEXT, a.parent_agency_id, 0 as depth
    FROM agencies a
    WHERE a.id = p_agency_id

    UNION ALL

    -- Recursive case: child agencies
    SELECT a.id, a.name::TEXT, a.parent_agency_id, at.depth + 1
    FROM agencies a
    INNER JOIN agency_tree at ON a.parent_agency_id = at.id
    WHERE at.depth < 50  -- Guard against infinite recursion
  )
  SELECT * FROM agency_tree ORDER BY depth ASC;
END;
$$;
```

---

## User Hierarchy

### Structure
```
Kerry Glass (Self Made owner)
└── Nick Neessen (The Standard owner, but hierarchy under Kerry)
    ├── Hunter Thornhill (direct downline of Nick)
    │   └── Nick Neessen2 (direct downline of Hunter)
    ├── James Minyo
    └── [other direct downlines]
```

### Key Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `upline_id` | Direct upline (1 level up) | Hunter's upline_id = Nick's ID |
| `hierarchy_path` | Full ancestry path (dot-separated) | `kerry_id.nick_id.hunter_id.nick2_id` |
| `agency_id` | Organizational assignment | The Standard's UUID |

### hierarchy_path Pattern

The `hierarchy_path` is a dot-separated string of UUIDs from the root to the user:

```
Root User:     "root_uuid"
Level 1:       "root_uuid.level1_uuid"
Level 2:       "root_uuid.level1_uuid.level2_uuid"
Level 3:       "root_uuid.level1_uuid.level2_uuid.level3_uuid"
```

**Critical**: To find all descendants of a user, use LIKE with their path + '.%':

```sql
-- Find all users in someone's downline tree
SELECT * FROM user_profiles
WHERE hierarchy_path LIKE 'owner_hierarchy_path' || '.%'
   OR id = owner_id;  -- Include the owner themselves
```

---

## Agency ID Assignment Rules

### How Users Get Assigned to Agencies

1. **New user joins under someone WITHOUT their own agency**
   → Inherits upline's `agency_id`

2. **New user joins under someone WHO OWNS an agency**
   → Gets assigned to that agency (the one their upline owns)

3. **Agency owners themselves**
   → May have agency_id of their OWN agency OR their parent agency (depends on setup)

### Example

```
Self Made Financial (agency)
├── Kerry Glass (owner, agency_id = Self Made)
│
└── The Standard (child agency)
    ├── Nick Neessen (owner, agency_id = The Standard)
    │   ├── Hunter (agency_id = The Standard, upline = Nick)
    │   │   └── Nick2 (agency_id = SHOULD BE The Standard, upline = Hunter)
    │   └── James (agency_id = The Standard, upline = Nick)
```

**Current Bug**: When Hunter invited Nick2, Nick2's `agency_id` was not set (NULL). It should have inherited The Standard from Hunter.

---

## AP (Annual Premium) Calculation

### Business Requirement

An agency's "Team AP" should include production from:
1. The agency owner
2. ALL users in the owner's downline tree (recursive, unlimited depth)

This is MLM-style: your team = you + everyone below you in the hierarchy.

### Correct Query Pattern

```sql
-- Calculate team AP for an agency
WITH owner_info AS (
  -- Get the agency owner's hierarchy_path
  SELECT
    a.owner_id,
    COALESCE(up.hierarchy_path, up.id::text) as owner_path
  FROM agencies a
  JOIN user_profiles up ON a.owner_id = up.id
  WHERE a.id = 'target_agency_id'
),
team_members AS (
  -- Find all users in the owner's downline tree
  -- This is hierarchy-based, NOT agency_id-based
  SELECT up.id
  FROM user_profiles up, owner_info oi
  WHERE up.approval_status = 'approved'
    AND up.archived_at IS NULL
    AND (
      up.id = oi.owner_id                           -- The owner themselves
      OR up.hierarchy_path LIKE oi.owner_path || '.%'  -- All descendants
    )
)
SELECT
  SUM(p.annual_premium) as total_ap,
  COUNT(*) as policy_count
FROM policies p
WHERE p.user_id IN (SELECT id FROM team_members)
  AND p.status = 'active';
```

### WRONG Pattern (Previous Bug)

```sql
-- This only finds users with matching agency_id (FLAT, not hierarchical)
SELECT SUM(p.annual_premium)
FROM policies p
JOIN user_profiles up ON p.user_id = up.id
WHERE up.agency_id = 'target_agency_id';  -- WRONG: misses nested downlines
```

**Why it's wrong**: If a Level 2+ downline has `agency_id = NULL` or a different agency, they're excluded even though they're in the owner's team.

---

## The Fixed RPC Function

Location: `supabase/migrations/20260115_001_fix_agency_metrics_hierarchy.sql`

```sql
CREATE OR REPLACE FUNCTION get_agency_dashboard_metrics(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  imo_id uuid,
  active_policies bigint,
  total_annual_premium numeric,
  total_commissions_ytd numeric,
  total_earned_ytd numeric,
  total_unearned numeric,
  agent_count bigint,
  avg_production_per_agent numeric,
  top_producer_id uuid,
  top_producer_name text,
  top_producer_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
  v_owner_id uuid;
  v_owner_hierarchy_path text;
BEGIN
  -- Determine which agency to query
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency';
  END IF;

  -- Get the IMO and owner for this agency
  SELECT a.imo_id, a.owner_id INTO v_imo_id, v_owner_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  -- Get the owner's hierarchy_path for recursive team lookup
  SELECT COALESCE(up.hierarchy_path, up.id::text) INTO v_owner_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_owner_id;

  -- [Access control checks...]

  RETURN QUERY
  WITH team_members AS (
    -- KEY FIX: Use hierarchy_path, NOT agency_id
    -- In MLM, team = hierarchy tree, not organizational assignment
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
    a.imo_id,
    -- Policy stats from team hierarchy
    COALESCE(policy_stats.active_policies, 0)::bigint,
    COALESCE(policy_stats.total_annual_premium, 0)::numeric,
    -- ... rest of metrics
  FROM agencies a
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND p.effective_date BETWEEN p_start_date AND p_end_date) as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND p.effective_date BETWEEN p_start_date AND p_end_date) as total_annual_premium
    FROM policies p
    WHERE p.user_id IN (SELECT tm.id FROM team_members tm)  -- Uses hierarchy!
  ) policy_stats ON true
  -- ... additional joins for commissions, top producer, etc.
  WHERE a.id = v_agency_id;
END;
$$;
```

---

## Related Functions That May Need Similar Fixes

Check these functions for the same flat `agency_id` bug:

| Function | File | Status |
|----------|------|--------|
| `get_agency_dashboard_metrics` | 20260115_001_fix_agency_metrics_hierarchy.sql | ✅ FIXED |
| `get_imo_dashboard_metrics` | 20260106_005_org_metrics_date_range.sql | Uses imo_id (OK for IMO-level) |
| `get_imo_production_by_agency` | 20260106_005_org_metrics_date_range.sql | May need review |
| `get_agency_production_by_agent` | 20260106_005_org_metrics_date_range.sql | May need review |
| `get_agency_override_summary` | 20260106_005_org_metrics_date_range.sql | May need review |

---

## Data Integrity Issues to Fix

### 1. NULL agency_id for Nested Downlines

```sql
-- Find users with NULL agency_id who have an upline with an agency
SELECT
  up.id,
  up.email,
  up.agency_id as current_agency,
  upline.email as upline_email,
  upline.agency_id as upline_agency
FROM user_profiles up
JOIN user_profiles upline ON up.upline_id = upline.id
WHERE up.agency_id IS NULL
  AND upline.agency_id IS NOT NULL;
```

### 2. Fix: Propagate agency_id from Upline

```sql
-- Update users to inherit agency_id from their upline
UPDATE user_profiles up
SET agency_id = upline.agency_id
FROM user_profiles upline
WHERE up.upline_id = upline.id
  AND up.agency_id IS NULL
  AND upline.agency_id IS NOT NULL;
```

### 3. Prevent Future Issues

The invitation/onboarding flow should automatically set `agency_id`:

```typescript
// When creating a new user under an upline
const newUser = {
  upline_id: upline.id,
  agency_id: upline.agency_id,  // Inherit from upline
  hierarchy_path: `${upline.hierarchy_path}.${newUserId}`,
  // ...
};
```

---

## Testing Queries

### Verify Team Members for an Agency

```sql
-- Check who's in an agency's "team" using hierarchy
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

### Verify AP Calculation

```sql
-- Check total AP for an agency's team
WITH team AS (
  -- [same CTE as above]
)
SELECT
  SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_ap,
  COUNT(*) FILTER (WHERE p.status = 'active') as policy_count
FROM policies p
WHERE p.user_id IN (SELECT id FROM team);
```

---

## Key Takeaways

1. **Two hierarchies exist**: Agency (organizational) and User (MLM upline/downline)
2. **Team AP uses USER hierarchy**, not agency_id membership
3. **hierarchy_path LIKE pattern** is the correct way to find all descendants
4. **agency_id is for organizational purposes**, not team membership calculations
5. **Always verify** nested downlines have proper agency_id assignment
