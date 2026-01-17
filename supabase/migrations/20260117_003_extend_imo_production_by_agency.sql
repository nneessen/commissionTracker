-- supabase/migrations/20260117_003_extend_imo_production_by_agency.sql
-- Extend get_imo_production_by_agency to include all fields needed by reports
--
-- This eliminates the duplicate get_team_comparison_report RPC by adding:
-- - policies_lapsed (for retention calculation)
-- - retention_rate
-- - rank_by_premium (window function)
-- - rank_by_policies (window function)
--
-- After this, reports can use the same RPC as the dashboard.

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

COMMENT ON FUNCTION get_imo_production_by_agency(date, date) IS
'Returns production breakdown by agency for the current user''s IMO.
Uses hierarchy_path to calculate each agency owner''s team production (MLM-style).

UPDATED 2026-01-17:
  - Extended to include all fields needed by reports (retention, ranks, lapsed)
  - This is now the SINGLE SOURCE OF TRUTH for agency production metrics
  - Eliminates the duplicate get_team_comparison_report RPC

Fields returned:
  - agency_id, agency_name, agency_code, owner_name
  - new_policies, policies_lapsed, retention_rate
  - new_premium, commissions_earned
  - agent_count, avg_premium_per_agent
  - rank_by_premium, rank_by_policies, pct_of_imo_premium

Requires IMO admin, IMO owner, or super admin role.';

-- Mark get_team_comparison_report as deprecated (will be removed in future migration)
COMMENT ON FUNCTION get_team_comparison_report(date, date) IS
'DEPRECATED: Use get_imo_production_by_agency instead.
This function will be removed in a future migration.';
