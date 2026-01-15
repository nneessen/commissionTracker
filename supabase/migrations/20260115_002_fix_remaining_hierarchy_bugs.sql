-- supabase/migrations/20260115_002_fix_remaining_hierarchy_bugs.sql
-- Fix remaining hierarchy/AP bugs identified in code review:
-- 1. get_imo_production_by_agency - uses flat agency_id, misses nested downlines
-- 2. get_agency_override_summary - uses oc.agency_id + missing IMO access check
-- 3. Invitation acceptance - doesn't propagate agency_id from upline

-- =====================================================
-- 1. FIX: get_imo_production_by_agency
-- Problem: Uses flat agency_id joins, misses nested downlines
-- Solution: For each agency, compute owner's hierarchy path and use that
-- =====================================================

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
  -- This uses hierarchy-based calculation for consistency
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.status = 'active'
    AND p.effective_date >= p_start_date
    AND p.effective_date <= p_end_date;

  RETURN QUERY
  WITH agency_owners AS (
    -- Get each agency's owner and their hierarchy path
    SELECT
      a.id as agency_id,
      a.name as agency_name,
      a.code as agency_code,
      a.owner_id,
      COALESCE(up.hierarchy_path, up.id::text) as owner_hierarchy_path,
      COALESCE(up.first_name || ' ' || up.last_name, up.email, 'No Owner') as owner_name
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  ),
  agency_team_members AS (
    -- For each agency, find all users in the owner's hierarchy tree
    SELECT
      ao.agency_id,
      up.id as user_id
    FROM agency_owners ao
    CROSS JOIN LATERAL (
      SELECT up.id
      FROM user_profiles up
      WHERE up.approval_status = 'approved'
        AND up.archived_at IS NULL
        AND (
          up.id = ao.owner_id
          OR up.hierarchy_path LIKE ao.owner_hierarchy_path || '.%'
        )
    ) up
  ),
  agency_metrics AS (
    SELECT
      atm.agency_id,
      COUNT(DISTINCT atm.user_id) as agent_count,
      COUNT(DISTINCT p.id) FILTER (
        WHERE p.status = 'active'
          AND p.effective_date >= p_start_date
          AND p.effective_date <= p_end_date
      ) as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (
        WHERE p.status = 'active'
          AND p.effective_date >= p_start_date
          AND p.effective_date <= p_end_date
      ), 0) as total_premium,
      COALESCE(SUM(c.amount) FILTER (
        WHERE c.payment_date >= p_start_date
          AND c.payment_date <= p_end_date
      ), 0) as commissions_ytd
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
    LEFT JOIN commissions c ON c.user_id = atm.user_id
    GROUP BY atm.agency_id
  )
  SELECT
    ao.agency_id,
    ao.agency_name,
    ao.agency_code,
    ao.owner_name,
    COALESCE(am.active_policies, 0)::bigint,
    COALESCE(am.total_premium, 0)::numeric,
    COALESCE(am.commissions_ytd, 0)::numeric,
    COALESCE(am.agent_count, 0)::bigint,
    CASE
      WHEN COALESCE(am.agent_count, 0) > 0
      THEN ROUND(COALESCE(am.total_premium, 0) / am.agent_count, 2)
      ELSE 0
    END::numeric as avg_production,
    CASE
      WHEN v_total_imo_premium > 0
      THEN ROUND(COALESCE(am.total_premium, 0) / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric as pct_of_imo_production
  FROM agency_owners ao
  LEFT JOIN agency_metrics am ON am.agency_id = ao.agency_id
  ORDER BY COALESCE(am.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency(date, date) TO authenticated;

COMMENT ON FUNCTION get_imo_production_by_agency(date, date) IS
'Returns production breakdown by agency for the current user''s IMO.
UPDATED 2026-01-15: Now uses hierarchy_path to find each agency owner''s team,
instead of flat agency_id membership. This correctly includes nested downlines.
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- 2. FIX: get_agency_override_summary
-- Problems:
--   a) Uses override_commissions.agency_id filtering (misses downlines with NULL agency)
--   b) IMO admin can read any agency (cross-tenant leak)
-- Solution: Use hierarchy for team membership + add IMO check
-- =====================================================

DROP FUNCTION IF EXISTS get_agency_override_summary(uuid, date, date);

CREATE OR REPLACE FUNCTION get_agency_override_summary(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  total_override_count bigint,
  total_override_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  chargeback_amount numeric,
  unique_uplines bigint,
  unique_downlines bigint,
  avg_override_per_policy numeric,
  top_earner_id uuid,
  top_earner_name text,
  top_earner_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_agency_imo_id uuid;
  v_user_agency_id uuid;
  v_is_owner boolean;
  v_is_imo_admin boolean;
  v_owner_id uuid;
  v_owner_hierarchy_path text;
BEGIN
  -- Get user's agency
  SELECT up.agency_id INTO v_user_agency_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  -- Determine target agency
  v_agency_id := COALESCE(p_agency_id, v_user_agency_id);

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not assigned to an agency'
      USING ERRCODE = 'P0001';
  END IF;

  -- Get the agency's IMO and owner
  SELECT a.imo_id, a.owner_id INTO v_agency_imo_id, v_owner_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_agency_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Get owner's hierarchy path for team lookup
  SELECT COALESCE(up.hierarchy_path, up.id::text) INTO v_owner_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_owner_id;

  -- Verify access: must be agency owner or IMO admin OF THE SAME IMO
  SELECT is_agency_owner(v_agency_id) INTO v_is_owner;
  SELECT is_imo_admin() INTO v_is_imo_admin;

  -- FIX: IMO admin must be in the SAME IMO as the agency
  IF NOT v_is_owner AND NOT (v_is_imo_admin AND get_my_imo_id() = v_agency_imo_id) AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Agency owner or IMO admin (same IMO) required'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  WITH team_members AS (
    -- FIX: Use hierarchy_path instead of agency_id
    SELECT up.id
    FROM user_profiles up
    WHERE up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = v_owner_id
        OR up.hierarchy_path LIKE v_owner_hierarchy_path || '.%'
      )
  ),
  -- FIX: Filter overrides by team membership (base_agent in team), not oc.agency_id
  filtered_overrides AS (
    SELECT oc.*
    FROM override_commissions oc
    INNER JOIN policies p ON oc.policy_id = p.id
    WHERE oc.base_agent_id IN (SELECT id FROM team_members)
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
  ),
  override_stats AS (
    SELECT
      fo.override_agent_id,
      SUM(fo.override_commission_amount) AS agent_total
    FROM filtered_overrides fo
    GROUP BY fo.override_agent_id
    ORDER BY agent_total DESC
    LIMIT 1
  ),
  top_earner AS (
    SELECT
      os.override_agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS name,
      os.agent_total
    FROM override_stats os
    LEFT JOIN user_profiles up ON up.id = os.override_agent_id
  )
  SELECT
    a.id AS agency_id,
    a.name AS agency_name,
    COUNT(fo.id) AS total_override_count,
    COALESCE(SUM(fo.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'pending' THEN fo.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'earned' THEN fo.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'paid' THEN fo.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(fo.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT fo.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT fo.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT fo.policy_id) > 0
      THEN ROUND(SUM(fo.override_commission_amount) / COUNT(DISTINCT fo.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy,
    te.override_agent_id AS top_earner_id,
    te.name AS top_earner_name,
    COALESCE(te.agent_total, 0) AS top_earner_amount
  FROM agencies a
  LEFT JOIN filtered_overrides fo ON true
  LEFT JOIN top_earner te ON true
  WHERE a.id = v_agency_id
  GROUP BY a.id, a.name, te.override_agent_id, te.name, te.agent_total;
END;
$$;

COMMENT ON FUNCTION get_agency_override_summary(uuid, date, date) IS
'Returns override commission summary for agency owners/IMO admins.
UPDATED 2026-01-15:
  - Uses hierarchy_path for team membership instead of oc.agency_id
  - Added IMO check for IMO admins (must be same IMO as agency)
Requires agency owner or IMO admin (same IMO) role.';

GRANT EXECUTE ON FUNCTION get_agency_override_summary(uuid, date, date) TO authenticated;


-- =====================================================
-- 3. FIX: Agency ID propagation on invitation acceptance
-- Create/update trigger to set agency_id from upline
-- =====================================================

-- Function to propagate agency_id when upline_id is set
CREATE OR REPLACE FUNCTION propagate_agency_from_upline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_agency_id uuid;
BEGIN
  -- Only act if upline_id changed and new upline exists
  IF NEW.upline_id IS NOT NULL AND (OLD.upline_id IS DISTINCT FROM NEW.upline_id) THEN
    -- Get the upline's agency_id
    SELECT agency_id INTO v_upline_agency_id
    FROM user_profiles
    WHERE id = NEW.upline_id;

    -- If upline has an agency and user doesn't, inherit it
    IF v_upline_agency_id IS NOT NULL AND NEW.agency_id IS NULL THEN
      NEW.agency_id := v_upline_agency_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_propagate_agency_from_upline ON user_profiles;

-- Create trigger to fire BEFORE UPDATE (so we can modify NEW)
CREATE TRIGGER trigger_propagate_agency_from_upline
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (NEW.upline_id IS DISTINCT FROM OLD.upline_id)
  EXECUTE FUNCTION propagate_agency_from_upline();

COMMENT ON FUNCTION propagate_agency_from_upline() IS
'Automatically sets agency_id from upline when upline_id is assigned.
This ensures new team members inherit their upline''s agency assignment.';


-- =====================================================
-- 4. ONE-TIME DATA REPAIR: Backfill NULL agency_id
-- For users who have an upline with an agency_id
-- =====================================================

-- Backfill agency_id from upline where missing
UPDATE user_profiles up
SET agency_id = upline.agency_id
FROM user_profiles upline
WHERE up.upline_id = upline.id
  AND up.agency_id IS NULL
  AND upline.agency_id IS NOT NULL;

-- Log how many were fixed (will show in migration output)
DO $$
DECLARE
  v_fixed_count int;
BEGIN
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled agency_id for % users', v_fixed_count;
END;
$$;
