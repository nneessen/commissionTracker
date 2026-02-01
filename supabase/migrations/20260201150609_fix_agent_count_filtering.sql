-- supabase/migrations/20260201150609_fix_agent_count_filtering.sql
-- Fix: Consistent agent count filtering across application
--
-- Problem: Agent counts were inconsistently including recruits.
-- Solution: Add proper role filtering to exclude pure recruits from agent counts.
--
-- An "active agent" is defined as:
--   - approval_status = 'approved'
--   - archived_at IS NULL
--   - Has role 'agent' OR 'active_agent' OR is_admin = true
--   - NOT a pure recruit (has 'recruit' role without 'agent' or 'active_agent')

-- ============================================================================
-- 1. Fix get_imo_dashboard_metrics - user_agg CTE missing role filter
-- ============================================================================
DROP FUNCTION IF EXISTS get_imo_dashboard_metrics();

CREATE OR REPLACE FUNCTION get_imo_dashboard_metrics()
RETURNS TABLE (
  imo_id uuid,
  imo_name text,
  total_active_policies bigint,
  total_annual_premium numeric,
  total_commissions_ytd numeric,
  total_earned_ytd numeric,
  total_unearned numeric,
  agent_count bigint,
  agency_count bigint,
  avg_production_per_agent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_year_start timestamptz;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Use UTC for consistent YTD calculations across all timezones
  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  RETURN QUERY
  WITH policy_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    WHERE c.imo_id = v_imo_id
  ),
  -- FIX: Add role filtering to exclude pure recruits from agent count
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
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
  agency_agg AS (
    SELECT COUNT(*) as agency_count
    FROM agencies a
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  )
  SELECT
    i.id as imo_id,
    i.name as imo_name,
    pa.active_policies::bigint as total_active_policies,
    pa.total_premium::numeric as total_annual_premium,
    ca.commissions_ytd::numeric as total_commissions_ytd,
    ca.earned_ytd::numeric as total_earned_ytd,
    ca.total_unearned::numeric as total_unearned,
    ua.agent_count::bigint as agent_count,
    aa.agency_count::bigint as agency_count,
    CASE
      WHEN ua.agent_count > 0
      THEN ROUND(pa.total_premium / ua.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent
  FROM imos i
  CROSS JOIN policy_agg pa
  CROSS JOIN commission_agg ca
  CROSS JOIN user_agg ua
  CROSS JOIN agency_agg aa
  WHERE i.id = v_imo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_dashboard_metrics() TO authenticated;

COMMENT ON FUNCTION get_imo_dashboard_metrics() IS
'Returns aggregated dashboard metrics for the current user''s IMO.
YTD calculations use UTC timezone for consistency across all users.
Agent counts exclude pure recruits (those with recruit role but no agent role).
Requires IMO admin, IMO owner, or super admin role.
Error codes: insufficient_privilege, invalid_parameter_value';


-- ============================================================================
-- 2. Fix get_agency_dashboard_metrics - user_agg CTE missing role filter
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

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

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
  WITH policy_agg AS (
    -- Use agency_id directly on policies for historical accuracy
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = v_agency_id
  ),
  -- FIX: Add role filtering to exclude pure recruits from agent count
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.agency_id = v_agency_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
      -- Must have agent/active_agent role OR be admin
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      -- Exclude pure recruits
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
  ),
  -- FIX: Also apply role filter to top producer CTE
  top_prod AS (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM user_profiles up
    LEFT JOIN policies p ON p.user_id = up.id AND p.status = 'active'
    WHERE up.agency_id = v_agency_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
      -- Must have agent/active_agent role OR be admin
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      -- Exclude pure recruits
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
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
Policies are attributed to the agency where they were created (historical accuracy).
Agent counts exclude pure recruits (those with recruit role but no agent role).
Error codes: insufficient_privilege, invalid_parameter_value, no_data_found';


-- ============================================================================
-- 3. Fix get_imo_production_by_agency - add role filtering to team members
-- NOTE: This function takes date parameters and returns extended columns
-- ============================================================================
DROP FUNCTION IF EXISTS get_imo_production_by_agency();
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
  -- Policy metrics
  new_policies bigint,
  policies_lapsed bigint,
  retention_rate numeric,
  -- Financial metrics
  new_premium numeric,
  commissions_earned numeric,
  -- Agent metrics
  agent_count bigint,
  avg_premium_per_agent numeric,
  -- Rankings
  rank_by_premium integer,
  rank_by_policies integer,
  pct_of_imo_premium numeric
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
    -- Find all users in each agency owner's hierarchy (MLM downlines)
    -- FIX: Exclude pure recruits from team member count
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
      -- FIX: Must have agent/active_agent role OR be admin
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      -- FIX: Exclude pure recruits
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
    )
  ),
  policy_stats AS (
    -- Active policies within date range
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
  lapse_stats AS (
    -- Lapsed policies within date range
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as lapsed_count
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.status = 'lapsed'
      AND p.cancellation_date >= p_start_date
      AND p.cancellation_date <= p_end_date
    GROUP BY atm.a_id
  ),
  commission_stats AS (
    SELECT
      atm.a_id,
      COALESCE(SUM(c.earned_amount), 0) as comm_earned
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
  ),
  agency_metrics AS (
    SELECT
      ao.a_id,
      ao.a_name,
      ao.a_code,
      ao.o_name,
      COALESCE(ps.policy_count, 0)::bigint as m_new_policies,
      COALESCE(ls.lapsed_count, 0)::bigint as m_policies_lapsed,
      CASE
        WHEN (COALESCE(ps.policy_count, 0) + COALESCE(ls.lapsed_count, 0)) > 0
        THEN ROUND(
          COALESCE(ps.policy_count, 0)::numeric /
          (COALESCE(ps.policy_count, 0) + COALESCE(ls.lapsed_count, 0)) * 100
        , 1)
        ELSE 100
      END::numeric as m_retention_rate,
      COALESCE(ps.total_premium, 0)::numeric as m_new_premium,
      COALESCE(cs.comm_earned, 0)::numeric as m_commissions_earned,
      COALESCE(ac.cnt, 0)::bigint as m_agent_count,
      CASE
        WHEN COALESCE(ac.cnt, 0) > 0
        THEN ROUND(COALESCE(ps.total_premium, 0) / ac.cnt, 2)
        ELSE 0
      END::numeric as m_avg_premium_per_agent,
      CASE
        WHEN v_total_imo_premium > 0
        THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_imo_premium * 100, 1)
        ELSE 0
      END::numeric as m_pct_of_imo_premium
    FROM agency_owners ao
    LEFT JOIN policy_stats ps ON ps.a_id = ao.a_id
    LEFT JOIN lapse_stats ls ON ls.a_id = ao.a_id
    LEFT JOIN commission_stats cs ON cs.a_id = ao.a_id
    LEFT JOIN agent_counts ac ON ac.a_id = ao.a_id
  )
  SELECT
    am.a_id,
    am.a_name,
    am.a_code,
    am.o_name,
    am.m_new_policies,
    am.m_policies_lapsed,
    am.m_retention_rate,
    am.m_new_premium,
    am.m_commissions_earned,
    am.m_agent_count,
    am.m_avg_premium_per_agent,
    RANK() OVER (ORDER BY am.m_new_premium DESC)::integer,
    RANK() OVER (ORDER BY am.m_new_policies DESC)::integer,
    am.m_pct_of_imo_premium
  FROM agency_metrics am
  ORDER BY am.m_new_premium DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency(date, date) TO authenticated;


-- ============================================================================
-- 4. Fix get_agency_production_by_agent - main WHERE missing role filter
-- ============================================================================
DROP FUNCTION IF EXISTS get_agency_production_by_agent(uuid);

CREATE OR REPLACE FUNCTION get_agency_production_by_agent(p_agency_id uuid DEFAULT NULL)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  contract_level integer,
  active_policies bigint,
  total_annual_premium numeric,
  commissions_ytd numeric,
  earned_ytd numeric,
  unearned_amount numeric,
  pct_of_agency_production numeric,
  joined_date timestamptz
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
  v_total_agency_premium numeric;
BEGIN
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  -- Get total agency premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_agency_premium
  FROM policies p
  WHERE p.agency_id = v_agency_id AND p.status = 'active';

  RETURN QUERY
  SELECT
    up.id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name,
    up.email as agent_email,
    up.contract_level,
    COALESCE(ps.active_policies, 0)::bigint as active_policies,
    COALESCE(ps.total_premium, 0)::numeric as total_annual_premium,
    COALESCE(cs.commissions_ytd, 0)::numeric as commissions_ytd,
    COALESCE(cs.earned_ytd, 0)::numeric as earned_ytd,
    COALESCE(cs.total_unearned, 0)::numeric as unearned_amount,
    CASE
      WHEN v_total_agency_premium > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_agency_premium * 100, 1)
      ELSE 0
    END::numeric as pct_of_agency_production,
    up.created_at as joined_date
  FROM user_profiles up
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_premium
    FROM policies p
    WHERE p.user_id = up.id
  ) ps ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start) as commissions_ytd,
      SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start) as earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    WHERE c.user_id = up.id
  ) cs ON true
  WHERE up.agency_id = v_agency_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL
    -- FIX: Add role filtering to exclude pure recruits
    AND (
      up.roles @> ARRAY['agent']
      OR up.roles @> ARRAY['active_agent']
      OR up.is_admin = true
    )
    AND NOT (
      up.roles @> ARRAY['recruit']
      AND NOT up.roles @> ARRAY['agent']
      AND NOT up.roles @> ARRAY['active_agent']
    )
  ORDER BY COALESCE(ps.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_production_by_agent(uuid) TO authenticated;


-- ============================================================================
-- 5. Fix get_team_leaderboard_data - team_members and hierarchy_counts CTEs
-- ============================================================================
DROP FUNCTION IF EXISTS get_team_leaderboard_data(date, date, integer);

CREATE OR REPLACE FUNCTION get_team_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_min_downlines integer DEFAULT 5
)
RETURNS TABLE (
  leader_id uuid,
  leader_name text,
  leader_email text,
  leader_profile_photo_url text,
  agency_id uuid,
  agency_name text,
  team_size bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Find team leaders: agents with N+ people in their FULL hierarchy (not just direct)
  -- First, get all potential leaders with their hierarchy paths
  potential_leaders AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND u.hierarchy_path IS NOT NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      -- Exclude pure recruits
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- FIX: Count full hierarchy size for each potential leader (excluding recruits)
  hierarchy_counts AS (
    SELECT
      pl.id AS leader_id,
      COUNT(DISTINCT u.id) AS hierarchy_size
    FROM potential_leaders pl
    INNER JOIN user_profiles u ON (
      -- Include leader themselves
      u.id = pl.id
      -- OR anyone whose hierarchy_path descends from leader's path
      OR u.hierarchy_path LIKE pl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      -- FIX: Add role filtering to exclude pure recruits
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
    GROUP BY pl.id
  ),

  -- Filter to only leaders with enough people in hierarchy
  team_leaders AS (
    SELECT
      pl.id,
      pl.name,
      pl.email,
      pl.profile_photo_url,
      pl.agency_id,
      pl.hierarchy_path,
      hc.hierarchy_size
    FROM potential_leaders pl
    INNER JOIN hierarchy_counts hc ON hc.leader_id = pl.id
    WHERE hc.hierarchy_size >= p_min_downlines
  ),

  -- FIX: Get all team members excluding recruits
  -- Uses hierarchy_path pattern matching for recursive descent
  team_members AS (
    SELECT DISTINCT
      tl.id AS leader_id,
      u.id AS member_id
    FROM team_leaders tl
    INNER JOIN user_profiles u ON (
      -- Leader themselves
      u.id = tl.id
      -- OR anyone whose hierarchy_path descends from leader's path
      OR u.hierarchy_path LIKE tl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      -- FIX: Add role filtering
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Count team size (should match hierarchy_size but recalculated for consistency)
  team_sizes AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT tm.member_id) AS team_size
    FROM team_members tm
    GROUP BY tm.leader_id
  ),

  -- Calculate combined IP per team (full hierarchy)
  -- IP = Active policies with paid advance commissions
  ip_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Calculate combined AP per team (full hierarchy)
  -- AP = Pending policies that have been submitted
  ap_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Count prospects per team (full hierarchy)
  prospect_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY tm.leader_id
  ),

  -- Count pipeline recruits per team (full hierarchy)
  pipeline_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY tm.leader_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      tl.id AS leader_id,
      tl.name AS leader_name,
      tl.email AS leader_email,
      tl.profile_photo_url AS leader_profile_photo_url,
      tl.agency_id,
      COALESCE(ts.team_size, 1) AS team_size,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM team_leaders tl
    LEFT JOIN team_sizes ts ON ts.leader_id = tl.id
    LEFT JOIN ip_data ip ON ip.leader_id = tl.id
    LEFT JOIN ap_data ap ON ap.leader_id = tl.id
    LEFT JOIN prospect_data pr ON pr.leader_id = tl.id
    LEFT JOIN pipeline_data pl ON pl.leader_id = tl.id
  ),

  -- Add agency names and rankings
  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.leader_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.leader_id,
    r.leader_name,
    r.leader_email,
    r.leader_profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.team_size,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.leader_name ASC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(date, date, integer) TO authenticated;

COMMENT ON FUNCTION get_team_leaderboard_data IS
'Returns team leaderboard data with FULL HIERARCHY aggregation.
A "team" is defined as a leader + everyone in their downward hierarchy tree.
Team leaders are agents with at least p_min_downlines people in their hierarchy.
Excludes pure recruits from team member counts.
Uses TEXT hierarchy_path with LIKE pattern matching to find all descendants.
Consistent with get_agency_leaderboard_data which uses the same traversal logic.';


-- ============================================================================
-- 6. Fix get_leaderboard_data (individual agent) - downline_counts CTE
-- ============================================================================
DROP FUNCTION IF EXISTS get_leaderboard_data(date, date, text, uuid, integer);

CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_scope text DEFAULT 'all',
  p_scope_id uuid DEFAULT NULL,
  p_team_threshold integer DEFAULT 5
)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  profile_photo_url text,
  agency_id uuid,
  agency_name text,
  direct_downline_count bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get all active agents (not recruits, not archived)
  active_agents AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path,
      u.upline_id
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      -- Exclude pure recruits
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Scope filtering (only for 'all' scope now - agency/team use separate RPCs)
  scoped_agents AS (
    SELECT a.*
    FROM active_agents a
    WHERE
      CASE
        WHEN p_scope = 'all' THEN true
        WHEN p_scope = 'agency' AND p_scope_id IS NOT NULL THEN a.agency_id = p_scope_id
        WHEN p_scope = 'team' AND p_scope_id IS NOT NULL THEN
          a.id = p_scope_id
          OR a.hierarchy_path LIKE (p_scope_id::text || '.%')
          OR a.upline_id = p_scope_id
        ELSE true
      END
  ),

  -- FIX: Count direct downlines for each agent (excluding pure recruits)
  downline_counts AS (
    SELECT
      u.upline_id AS agent_id,
      COUNT(*) AS downline_count
    FROM user_profiles u
    WHERE u.upline_id IS NOT NULL
      AND u.approval_status = 'approved'
      AND u.archived_at IS NULL
      -- FIX: Add role filtering to exclude pure recruits
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
    GROUP BY u.upline_id
  ),

  -- Calculate IP (Issued Premium) - policies with status='active' AND commission status='paid'
  ip_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM policies p
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Calculate AP (Annual Premium) - policies with status='pending' (not declined/cancelled)
  ap_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM policies p
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Count prospects (not yet enrolled in pipeline)
  prospect_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS prospect_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND (
        u.onboarding_status = 'prospect'
        OR (u.onboarding_started_at IS NULL AND u.onboarding_status IS NULL)
      )
    GROUP BY u.recruiter_id
  ),

  -- Count pipeline recruits (actively in a pipeline phase)
  pipeline_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS pipeline_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND u.onboarding_status IS NOT NULL
      AND u.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY u.recruiter_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      sa.id AS agent_id,
      sa.name AS agent_name,
      sa.email AS agent_email,
      sa.profile_photo_url,
      sa.agency_id,
      COALESCE(dc.downline_count, 0) AS direct_downline_count,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM scoped_agents sa
    LEFT JOIN downline_counts dc ON dc.agent_id = sa.id
    LEFT JOIN ip_data ip ON ip.user_id = sa.id
    LEFT JOIN ap_data ap ON ap.user_id = sa.id
    LEFT JOIN prospect_data pr ON pr.recruiter_id = sa.id
    LEFT JOIN pipeline_data pl ON pl.recruiter_id = sa.id
  ),

  -- Add agency names and rankings
  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.agent_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.agent_id,
    r.agent_name,
    r.agent_email,
    r.profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.direct_downline_count,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agent_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_leaderboard_data(date, date, text, uuid, integer) TO authenticated;

COMMENT ON FUNCTION get_leaderboard_data IS
'Returns individual agent leaderboard with IP (Issued Premium - active policies with paid commissions)
and AP (Annual Premium - pending policies).
Direct downline counts exclude pure recruits.';


-- ============================================================================
-- 7. Fix check_team_size_limit - count only graduated agents, not recruits
-- ============================================================================
DROP FUNCTION IF EXISTS check_team_size_limit(uuid);

CREATE OR REPLACE FUNCTION check_team_size_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_current_count int;
  v_plan_name text;
  v_can_add boolean;
  v_at_warning boolean;
BEGIN
  -- Get user's team size limit from their subscription plan
  SELECT sp.team_size_limit, sp.name
  INTO v_limit, v_plan_name
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
    AND (us.grandfathered_until IS NULL OR us.grandfathered_until > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Default to 0 if no subscription found
  IF v_limit IS NULL THEN
    -- Check if it's Team tier (unlimited)
    IF v_plan_name = 'team' THEN
      v_limit := NULL;
    ELSE
      v_limit := 0;
    END IF;
  END IF;

  -- FIX: Count current direct downlines (only graduated agents, not recruits)
  SELECT COUNT(*)
  INTO v_current_count
  FROM user_profiles
  WHERE upline_id = p_user_id
    AND approval_status = 'approved'
    AND archived_at IS NULL
    -- Must have agent/active_agent role OR be admin
    AND (
      roles @> ARRAY['agent']
      OR roles @> ARRAY['active_agent']
      OR is_admin = true
    )
    -- Exclude pure recruits
    AND NOT (
      roles @> ARRAY['recruit']
      AND NOT roles @> ARRAY['agent']
      AND NOT roles @> ARRAY['active_agent']
    );

  -- Determine if user can add more
  IF v_limit IS NULL THEN
    -- Unlimited (Team tier)
    v_can_add := TRUE;
    v_at_warning := FALSE;
  ELSIF v_limit = 0 THEN
    -- No team features
    v_can_add := FALSE;
    v_at_warning := FALSE;
  ELSE
    v_can_add := v_current_count < v_limit;
    v_at_warning := v_current_count >= (v_limit - 1); -- Warn at limit - 1 (e.g., 4 for limit of 5)
  END IF;

  RETURN jsonb_build_object(
    'limit', v_limit,
    'current', v_current_count,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(0, v_limit - v_current_count) END,
    'can_add', v_can_add,
    'at_warning', v_at_warning,
    'plan_name', COALESCE(v_plan_name, 'Free')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_team_size_limit(uuid) TO authenticated;

COMMENT ON COLUMN subscription_plans.team_size_limit IS
'Maximum number of graduated agents (not recruits) in direct downline allowed.
NULL = unlimited, 0 = no team features access.
Only counts users with agent/active_agent role, excludes pure recruits.';
