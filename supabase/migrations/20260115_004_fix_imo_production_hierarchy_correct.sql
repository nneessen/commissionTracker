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
  agent_counts AS (
    SELECT
      a_id,
      COUNT(DISTINCT user_id) as cnt
    FROM agency_team_members
    GROUP BY a_id
  )
  SELECT
    ao.a_id,
    ao.a_name,
    ao.a_code,
    ao.o_name,
    COALESCE(ps.policy_count, 0)::bigint,
    COALESCE(ps.total_premium, 0)::numeric,
    COALESCE(cs.comm_ytd, 0)::numeric,
    COALESCE(ac.cnt, 0)::bigint,
    CASE
      WHEN COALESCE(ac.cnt, 0) > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / ac.cnt, 2)
      ELSE 0
    END::numeric,
    CASE
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
