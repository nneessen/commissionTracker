-- Fix IP metric accuracy: use effective_date instead of submit_date/created_at
-- Add statement timeouts to prevent connection pool exhaustion
-- NOTE: Index changes are in a separate file (20260213192050) to allow CONCURRENTLY

-- =====================================================
-- 1. Fix get_imo_production_by_agency: use effective_date for IP filtering
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_imo_production_by_agency(
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  new_policies bigint,
  policies_lapsed bigint,
  retention_rate numeric,
  new_premium numeric,
  commissions_earned numeric,
  agent_count bigint,
  avg_premium_per_agent numeric,
  rank_by_premium integer,
  rank_by_policies integer,
  pct_of_imo_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout = '10s'
AS $function$
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
  -- FIX: Use effective_date instead of COALESCE(submit_date, created_at)
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.lifecycle_status = 'active'
    AND p.effective_date IS NOT NULL
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
    )
  ),
  policy_stats AS (
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as policy_count,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.lifecycle_status = 'active'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY atm.a_id
  ),
  lapse_stats AS (
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as lapsed_count
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.lifecycle_status = 'lapsed'
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
$function$;

COMMENT ON FUNCTION get_imo_production_by_agency IS
  'Returns production metrics grouped by agency for the IMO dashboard. Uses effective_date for IP filtering.';

-- =====================================================
-- 2. Add statement timeouts to leaderboard functions
-- =====================================================

ALTER FUNCTION get_leaderboard_data(date, date, text, uuid, integer)
  SET statement_timeout = '10s';

ALTER FUNCTION get_agency_leaderboard_data(date, date)
  SET statement_timeout = '10s';

ALTER FUNCTION get_team_leaderboard_data(date, date, integer)
  SET statement_timeout = '10s';
