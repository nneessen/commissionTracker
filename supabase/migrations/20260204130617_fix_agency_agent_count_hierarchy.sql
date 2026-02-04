-- supabase/migrations/20260204130617_fix_agency_agent_count_hierarchy.sql
-- Fix: Agency dashboard agent count uses hierarchy traversal (not flat agency_id lookup)
--
-- Problem: get_agency_dashboard_metrics(uuid) was counting agents using:
--   WHERE up.agency_id = v_agency_id
-- This only counts agents directly assigned to the agency, NOT their downlines.
--
-- Solution: Count using hierarchy_path traversal, same pattern as:
--   - get_imo_production_by_agency()
--   - get_team_leaderboard_data()
--
-- Expected result: Self Made Financial changes from 39 to 77 (all agents)

-- ============================================================================
-- Fix get_agency_dashboard_metrics - use hierarchy traversal for agent count
-- ============================================================================
DROP FUNCTION IF EXISTS get_agency_dashboard_metrics(uuid);

CREATE OR REPLACE FUNCTION get_agency_dashboard_metrics(p_agency_id uuid DEFAULT NULL)
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
  v_year_start timestamptz;
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
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Get the IMO and owner for this agency
  SELECT a.imo_id, a.owner_id
  INTO v_imo_id, v_owner_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Get the owner's hierarchy path for team traversal
  SELECT COALESCE(up.hierarchy_path, up.id::text)
  INTO v_owner_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_owner_id;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- UTC-based YTD calculation
  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  RETURN QUERY
  WITH
  -- FIX: Use hierarchy traversal to find all team members (same as get_imo_production_by_agency)
  team_members AS (
    SELECT up.id
    FROM user_profiles up
    WHERE up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = v_owner_id
        OR up.hierarchy_path LIKE v_owner_hierarchy_path || '.%'
      )
      -- Must have agent/active_agent role OR be admin
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      -- Exclude pure recruits (have 'recruit' without 'agent' or 'active_agent')
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
  ),
  policy_agg AS (
    -- Use team members for policy aggregation (hierarchy-based)
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.user_id IN (SELECT id FROM team_members)
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    WHERE c.user_id IN (SELECT id FROM team_members)
  ),
  -- FIX: Agent count now uses hierarchy traversal via team_members CTE
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM team_members
  ),
  -- FIX: Top producer from team hierarchy
  top_prod AS (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM user_profiles up
    LEFT JOIN policies p ON p.user_id = up.id AND p.status = 'active'
    WHERE up.id IN (SELECT id FROM team_members)
    GROUP BY up.id, up.first_name, up.last_name, up.email
    ORDER BY total_premium DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    a.imo_id,
    pa.active_policies::bigint as active_policies,
    pa.total_premium::numeric as total_annual_premium,
    ca.commissions_ytd::numeric as total_commissions_ytd,
    ca.earned_ytd::numeric as total_earned_ytd,
    ca.total_unearned::numeric as total_unearned,
    ua.agent_count::bigint as agent_count,
    CASE
      WHEN ua.agent_count > 0
      THEN ROUND(pa.total_premium / ua.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent,
    tp.user_id as top_producer_id,
    tp.producer_name as top_producer_name,
    COALESCE(tp.total_premium, 0)::numeric as top_producer_premium
  FROM agencies a
  CROSS JOIN policy_agg pa
  CROSS JOIN commission_agg ca
  CROSS JOIN user_agg ua
  LEFT JOIN top_prod tp ON true
  WHERE a.id = v_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_dashboard_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION get_agency_dashboard_metrics(uuid) IS
'Returns aggregated dashboard metrics for a specific agency.
YTD calculations use UTC timezone for consistency across all users.
Agent count uses HIERARCHY TRAVERSAL (owner + all descendants in hierarchy_path).
This matches get_imo_production_by_agency() pattern.
Agent counts exclude pure recruits (those with recruit role but no agent role).
Error codes: insufficient_privilege, invalid_parameter_value, no_data_found';
