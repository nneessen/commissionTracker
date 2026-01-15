# Hierarchy & AP Calculation Fix - Complete Documentation

**Date:** 2026-01-15
**Issue:** Production by Agency panel showing incorrect AP totals
**Root Causes:**
1. SQL function had cartesian product bug + ambiguous column names
2. Hayes Crockett was not linked to Kerry's hierarchy tree

---

## 1. SQL Function: `get_imo_production_by_agency`

### Location
`supabase/migrations/20260115_004_fix_imo_production_hierarchy_correct.sql`

### Problem Description
The original function used flat `agency_id` lookups which missed nested downlines. Previous fix attempts had:
- **Cartesian product bug**: Joining `policies` and `commissions` in the same subquery caused each policy's AP to be multiplied by the number of commission entries per user (~7x average), inflating $168K → $1.8M
- **Ambiguous column names**: CTE columns named `agency_id` conflicted with `RETURNS TABLE` output columns, causing PostgreSQL error 42702

### Complete Fixed SQL Function

```sql
-- supabase/migrations/20260115_004_fix_imo_production_hierarchy_correct.sql
-- FIX: get_imo_production_by_agency to use hierarchy-based team calculation
--
-- Issues fixed:
-- 1. Previous attempt (002) had CARTESIAN PRODUCT bug (policies x commissions)
-- 2. CTE column names conflicted with RETURNS TABLE columns (ambiguous reference)
--
-- This fix:
--   1. Uses hierarchy_path for team membership (correct for MLM)
--   2. Calculates policy stats and commission stats SEPARATELY (no cartesian)
--   3. Renames CTE columns (a_id, a_name, etc.) to avoid conflict with output columns

DROP FUNCTION IF EXISTS get_imo_production_by_agency(date, date);

CREATE OR REPLACE FUNCTION get_imo_production_by_agency(
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  active_policies bigint,
  total_annual_premium numeric,
  commissions_ytd numeric,
  agent_count bigint,
  avg_production numeric,
  pct_of_imo_production numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_total_imo_premium numeric;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO';
  END IF;

  -- Get total IMO premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.status = 'active'
    AND p.effective_date >= p_start_date
    AND p.effective_date <= p_end_date;

  RETURN QUERY
  WITH agency_owners AS (
    -- Renamed: a_id instead of agency_id to avoid conflict with RETURNS TABLE
    -- For each active agency in this IMO, get the owner's hierarchy path
    SELECT
      a.id as a_id,
      a.name as a_name,
      a.code as a_code,
      a.owner_id,
      COALESCE(up.hierarchy_path, up.id::text) as owner_hierarchy_path,
      COALESCE(up.first_name || ' ' || up.last_name, up.email, 'No Owner') as o_name
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  ),
  agency_team_members AS (
    -- For each agency, find ALL users in the owner's hierarchy tree
    -- This includes:
    --   1. The owner themselves (up.id = ao.owner_id)
    --   2. All recursive downlines (hierarchy_path LIKE owner_path || '.%')
    --
    -- This is MLM-style: if someone is below you in the tree, their production
    -- counts toward your agency's total
    SELECT
      ao.a_id,
      up.id as user_id
    FROM agency_owners ao
    JOIN user_profiles up ON (
      up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = ao.owner_id
        OR up.hierarchy_path LIKE ao.owner_hierarchy_path || '.%'
      )
    )
  ),
  -- CRITICAL: Calculate policy stats SEPARATELY from commissions
  -- Joining both in the same query causes cartesian product multiplication
  policy_stats AS (
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as policy_count,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.status = 'active'
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY atm.a_id
  ),
  -- CRITICAL: Calculate commission stats SEPARATELY from policies
  commission_stats AS (
    SELECT
      atm.a_id,
      COALESCE(SUM(c.amount), 0) as comm_ytd
    FROM agency_team_members atm
    LEFT JOIN commissions c ON c.user_id = atm.user_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY atm.a_id
  ),
  -- Agent count per agency (from hierarchy tree)
  agent_counts AS (
    SELECT
      a_id,
      COUNT(DISTINCT user_id) as cnt
    FROM agency_team_members
    GROUP BY a_id
  )
  -- Final SELECT: Join all the pre-aggregated stats
  -- Column positions must match RETURNS TABLE order exactly
  SELECT
    ao.a_id,                                          -- agency_id
    ao.a_name,                                        -- agency_name
    ao.a_code,                                        -- agency_code
    ao.o_name,                                        -- owner_name
    COALESCE(ps.policy_count, 0)::bigint,            -- active_policies
    COALESCE(ps.total_premium, 0)::numeric,          -- total_annual_premium
    COALESCE(cs.comm_ytd, 0)::numeric,               -- commissions_ytd
    COALESCE(ac.cnt, 0)::bigint,                     -- agent_count
    CASE                                              -- avg_production
      WHEN COALESCE(ac.cnt, 0) > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / ac.cnt, 2)
      ELSE 0
    END::numeric,
    CASE                                              -- pct_of_imo_production
      WHEN v_total_imo_premium > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric
  FROM agency_owners ao
  LEFT JOIN policy_stats ps ON ps.a_id = ao.a_id
  LEFT JOIN commission_stats cs ON cs.a_id = ao.a_id
  LEFT JOIN agent_counts ac ON ac.a_id = ao.a_id
  ORDER BY COALESCE(ps.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency(date, date) TO authenticated;

COMMENT ON FUNCTION get_imo_production_by_agency(date, date) IS
'Returns production breakdown by agency for the current user''s IMO.
Uses hierarchy_path to calculate each agency owner''s team production (MLM-style).

UPDATED 2026-01-15:
  - Fixed cartesian product bug from previous version
  - Fixed ambiguous column reference error (renamed CTE columns)
  - Policy stats and commission stats calculated separately

Note: Hierarchy teams overlap by design - parent agency includes child agency teams.
Self Made Financial will show the entire organization''s production because
Kerry Glass is at the top of the hierarchy tree.

Requires IMO admin, IMO owner, or super admin role.';
```

### Key Design Decisions

1. **Hierarchy-based team membership**: Uses `hierarchy_path LIKE owner_path || '.%'` to find all recursive downlines, not flat `agency_id` lookup

2. **Separate aggregations**: Policy stats and commission stats are calculated in separate CTEs then joined, preventing cartesian product multiplication

3. **Renamed CTE columns**: Uses `a_id`, `a_name`, `a_code`, `o_name` instead of `agency_id`, `agency_name`, etc. to avoid PostgreSQL error 42702 (ambiguous column reference)

4. **Overlapping totals expected**: Self Made Financial's total will include The Standard, Ten Toes Down, and 1 of 1 Financial because their owners are in Kerry's downline tree

---

## 2. Data Fix: Hayes Crockett Hierarchy

### Problem
Hayes Crockett (owner of 1 of 1 Financial) had:
- `upline_id`: NULL
- `hierarchy_path`: `b34e38c5-f1bd-4c4b-94b3-26ba43e04944` (just his own ID)

This meant he was NOT in Kerry Glass's hierarchy tree, so his team's production wasn't rolling up to Self Made Financial.

### Fix Applied

```sql
-- Fix Hayes's upline and hierarchy_path to be under Kerry
WITH kerry AS (
  SELECT id, hierarchy_path
  FROM user_profiles
  WHERE email = 'kerryglass.ffl@gmail.com'
),
hayes AS (
  SELECT id
  FROM user_profiles
  WHERE email = 'hayescrockett6@gmail.com'
)
UPDATE user_profiles up
SET
  upline_id = (SELECT id FROM kerry),
  hierarchy_path = (SELECT hierarchy_path FROM kerry) || '.' || up.id::text
FROM hayes h
WHERE up.id = h.id;
```

### Automatic Cascade
The database has a trigger that automatically cascaded the hierarchy_path change to all of Hayes's 10 downlines:

```
NOTICE: Agent b34e38c5-... upline changed to 30d4fe4c-...: path=30d4fe4c-....b34e38c5-..., depth=1
NOTICE: Cascaded hierarchy change from b34e38c5-....33e5c592-... to 30d4fe4c-....b34e38c5-....33e5c592-... for user 33e5c592-...
[... 9 more cascade notices ...]
```

### Verified Result

| Agency | Owner | Upline | Tree Status |
|--------|-------|--------|-------------|
| Self Made Financial | kerryglass.ffl@gmail.com | (none - root) | Under Kerry |
| 1 of 1 Financial | hayescrockett6@gmail.com | kerryglass.ffl@gmail.com | Under Kerry ✓ |
| The Standard | nickneessen@thestandardhq.com | kerryglass.ffl@gmail.com | Under Kerry |
| Ten Toes Down | chasecockrell08@gmail.com | kerryglass.ffl@gmail.com | Under Kerry |

---

## 3. TypeScript Code Change

### File
`src/services/imo/ImoService.ts`

### Change
Removed temporary debug logging that was added to diagnose the issue.

### Before (with debug logging)
```typescript
// Build params using centralized utility (defaults to YTD)
const params = buildDateRangeParams(dateRange);

// DEBUG: Log the params being sent
console.log('[DEBUG] get_imo_production_by_agency params:', JSON.stringify(params));

const { data, error } = await supabase.rpc(
  "get_imo_production_by_agency",
  params,
);

// DEBUG: Log the full error object
if (error) {
  console.log('[DEBUG] RPC error:', JSON.stringify(error, null, 2));
  // Handle access denied gracefully using error codes
```

### After (clean)
```typescript
// Build params using centralized utility (defaults to YTD)
const params = buildDateRangeParams(dateRange);

const { data, error } = await supabase.rpc(
  "get_imo_production_by_agency",
  params,
);

if (error) {
  // Handle access denied gracefully using error codes
```

---

## 4. Verification Query

Use this to verify the hierarchy-based totals are calculating correctly:

```sql
WITH agency_owners AS (
  SELECT
    a.id as a_id,
    a.name as a_name,
    a.owner_id,
    COALESCE(up.hierarchy_path, up.id::text) as owner_path
  FROM agencies a
  LEFT JOIN user_profiles up ON a.owner_id = up.id
  WHERE a.is_active = true
),
team_members AS (
  SELECT
    ao.a_id,
    ao.a_name,
    up.id as member_id
  FROM agency_owners ao
  JOIN user_profiles up ON (
    up.approval_status = 'approved'
    AND up.archived_at IS NULL
    AND (up.id = ao.owner_id OR up.hierarchy_path LIKE ao.owner_path || '.%')
  )
)
SELECT
  tm.a_name as agency,
  COUNT(DISTINCT tm.member_id) as team_size,
  COUNT(DISTINCT p.id) as policies,
  ROUND(COALESCE(SUM(p.annual_premium), 0), 2) as total_ap
FROM team_members tm
LEFT JOIN policies p ON p.user_id = tm.member_id AND p.status = 'active'
GROUP BY tm.a_id, tm.a_name
ORDER BY total_ap DESC;
```

### Expected Results (as of 2026-01-15)

| Agency | Team Size | Policies | Total AP |
|--------|-----------|----------|----------|
| Self Made Financial | 46 | 76 | $154,794.24 |
| 1 of 1 Financial | 10 | 24 | $53,144.28 |
| The Standard | 9 | 12 | $27,291.60 |
| Ten Toes Down | 6 | 9 | $25,757.28 |

**Note**: Self Made's total ($154,794) is greater than the sum of sub-agencies ($106,193) because there are 21 additional agents directly under Kerry who aren't assigned to a sub-agency.

---

## 5. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/20260115_004_fix_imo_production_hierarchy_correct.sql` | Modified | Complete rewrite of `get_imo_production_by_agency` function |
| `src/services/imo/ImoService.ts` | Modified | Removed debug logging |
| `user_profiles` table | Data fix | Updated Hayes Crockett's `upline_id` and `hierarchy_path` |

---

## 6. How Hierarchy-Based Calculation Works

### The `hierarchy_path` Field

Each user has a `hierarchy_path` that is a dot-separated string of UUIDs from root to themselves:

```
Kerry:   "30d4fe4c-1949-41fa-8147-d382a9d127bf"
Hayes:   "30d4fe4c-1949-41fa-8147-d382a9d127bf.b34e38c5-f1bd-4c4b-94b3-26ba43e04944"
Nick:    "30d4fe4c-1949-41fa-8147-d382a9d127bf.d0d3edea-af6d-4990-80b8-1765ba829896"
Hunter:  "30d4fe4c-1949-41fa-8147-d382a9d127bf.d0d3edea-af6d-4990-80b8-1765ba829896.a24b4457-09b1-4a40-b67e-4821a302ad5e"
```

### Finding Team Members

To find all users in an agency owner's team:

```sql
WHERE up.id = owner_id                              -- The owner themselves
   OR up.hierarchy_path LIKE owner_path || '.%'     -- All descendants
```

This is recursive - it finds ALL users below the owner in the tree, regardless of depth.

### Why Totals Overlap

Self Made Financial (Kerry) shows $154K while sub-agencies total $106K because:
- Kerry's team includes everyone (46 agents)
- Hayes's team is a SUBSET of Kerry's team (10 agents)
- Nick's team is a SUBSET of Kerry's team (9 agents)
- Chase's team is a SUBSET of Kerry's team (6 agents)
- The remaining 21 agents are directly under Kerry but not in a sub-agency

This overlapping is INTENTIONAL for MLM-style hierarchies where parent agencies see all downstream production.
