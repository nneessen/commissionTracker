-- supabase/migrations/20260204094256_fix_performance_reports_date_filter.sql
-- Fix Performance Reports Date Filtering
--
-- Problem: Agency Performance Report, IMO Performance Report, and related functions
-- were using effective_date for date filtering instead of submit_date (with fallback).
--
-- Business Impact:
--   - Reports showing "January policies" actually showed policies with coverage starting in January
--   - NOT policies submitted to carrier in January
--   - Inconsistent with how production is tracked (when deal was submitted, not when coverage starts)
--
-- Solution: Use COALESCE(p.submit_date, p.created_at) for date filtering
-- Precedent: Migration 20260203180830_fix_team_analytics_date_filter.sql already fixed Team Analytics

-- ============================================================================
-- 1. Fix get_imo_performance_report
-- Changes:
--   - policy_activity CTE: effective_date -> COALESCE(submit_date, created_at)
--   - base_totals CTE: effective_date -> COALESCE(submit_date, created_at)
-- ============================================================================

DROP FUNCTION IF EXISTS get_imo_performance_report(date, date);

CREATE OR REPLACE FUNCTION get_imo_performance_report(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  month_start date,
  month_label text,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  new_agents bigint,
  policies_lapsed bigint,
  lapsed_premium numeric,
  net_premium_change numeric,
  running_total_policies bigint,
  running_total_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', p_start_date)::date,
      date_trunc('month', p_end_date)::date,
      INTERVAL '1 month'
    )::date AS month_start
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  policy_activity AS (
    SELECT
      date_trunc('month', COALESCE(p.submit_date, p.created_at))::date AS month,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('month', p.status_change_date)::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND p.status = 'lapsed'
      AND p.status_change_date >= p_start_date
      AND p.status_change_date <= p_end_date
    GROUP BY date_trunc('month', p.status_change_date)::date
  ),
  commission_activity AS (
    SELECT
      date_trunc('month', c.payment_date)::date AS month,
      COALESCE(SUM(c.earned_amount), 0) AS commissions_earned
    FROM commissions c
    WHERE c.imo_id = v_imo_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY date_trunc('month', c.payment_date)::date
  ),
  agent_activity AS (
    SELECT
      date_trunc('month', up.created_at)::date AS month,
      COUNT(*) AS new_agents
    FROM user_profiles up
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.created_at >= p_start_date
      AND up.created_at <= p_end_date
    GROUP BY date_trunc('month', up.created_at)::date
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
  )
  SELECT
    m.month_start,
    to_char(m.month_start, 'Mon YYYY') AS month_label,
    COALESCE(pa.new_policies, 0)::bigint AS new_policies,
    COALESCE(pa.new_premium, 0)::numeric AS new_premium,
    COALESCE(ca.commissions_earned, 0)::numeric AS commissions_earned,
    COALESCE(aa.new_agents, 0)::bigint AS new_agents,
    COALESCE(la.policies_lapsed, 0)::bigint AS policies_lapsed,
    COALESCE(la.lapsed_premium, 0)::numeric AS lapsed_premium,
    (COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0))::numeric AS net_premium_change,
    (bt.initial_policies + SUM(COALESCE(pa.new_policies, 0) - COALESCE(la.policies_lapsed, 0)) OVER (ORDER BY m.month_start))::bigint AS running_total_policies,
    (bt.initial_premium + SUM(COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0)) OVER (ORDER BY m.month_start))::numeric AS running_total_premium
  FROM months m
  CROSS JOIN base_totals bt
  LEFT JOIN policy_activity pa ON pa.month = m.month_start
  LEFT JOIN lapse_activity la ON la.month = m.month_start
  LEFT JOIN commission_activity ca ON ca.month = m.month_start
  LEFT JOIN agent_activity aa ON aa.month = m.month_start
  ORDER BY m.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_performance_report(date, date) TO authenticated;

COMMENT ON FUNCTION get_imo_performance_report(date, date) IS
'Returns monthly performance metrics for the current user''s IMO.
Includes new policies, commissions, agent growth, and running totals.
Date filtering uses COALESCE(submit_date, created_at) for accurate production tracking.
Requires IMO admin, IMO owner, or super admin role.';


-- ============================================================================
-- 2. Fix get_agency_performance_report
-- Changes:
--   - policy_activity CTE: effective_date -> COALESCE(submit_date, created_at)
--   - base_totals CTE: effective_date -> COALESCE(submit_date, created_at)
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_performance_report(uuid, date, date);

CREATE OR REPLACE FUNCTION get_agency_performance_report(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  month_start date,
  month_label text,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  new_agents bigint,
  policies_lapsed bigint,
  lapsed_premium numeric,
  net_premium_change numeric,
  running_total_policies bigint,
  running_total_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
BEGIN
  -- Determine which agency to query
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = '22023';
  END IF;

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check: must be agency owner, IMO admin (same IMO), or super admin
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', p_start_date)::date,
      date_trunc('month', p_end_date)::date,
      INTERVAL '1 month'
    )::date AS month_start
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  policy_activity AS (
    SELECT
      date_trunc('month', COALESCE(p.submit_date, p.created_at))::date AS month,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('month', p.status_change_date)::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.status = 'lapsed'
      AND p.status_change_date >= p_start_date
      AND p.status_change_date <= p_end_date
    GROUP BY date_trunc('month', p.status_change_date)::date
  ),
  commission_activity AS (
    SELECT
      date_trunc('month', c.payment_date)::date AS month,
      COALESCE(SUM(c.earned_amount), 0) AS commissions_earned
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY date_trunc('month', c.payment_date)::date
  ),
  agent_activity AS (
    SELECT
      date_trunc('month', up.created_at)::date AS month,
      COUNT(*) AS new_agents
    FROM user_profiles up
    WHERE up.agency_id = v_agency_id
      AND up.approval_status = 'approved'
      AND up.created_at >= p_start_date
      AND up.created_at <= p_end_date
    GROUP BY date_trunc('month', up.created_at)::date
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
  )
  SELECT
    m.month_start,
    to_char(m.month_start, 'Mon YYYY') AS month_label,
    COALESCE(pa.new_policies, 0)::bigint AS new_policies,
    COALESCE(pa.new_premium, 0)::numeric AS new_premium,
    COALESCE(ca.commissions_earned, 0)::numeric AS commissions_earned,
    COALESCE(aa.new_agents, 0)::bigint AS new_agents,
    COALESCE(la.policies_lapsed, 0)::bigint AS policies_lapsed,
    COALESCE(la.lapsed_premium, 0)::numeric AS lapsed_premium,
    (COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0))::numeric AS net_premium_change,
    (bt.initial_policies + SUM(COALESCE(pa.new_policies, 0) - COALESCE(la.policies_lapsed, 0)) OVER (ORDER BY m.month_start))::bigint AS running_total_policies,
    (bt.initial_premium + SUM(COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0)) OVER (ORDER BY m.month_start))::numeric AS running_total_premium
  FROM months m
  CROSS JOIN base_totals bt
  LEFT JOIN policy_activity pa ON pa.month = m.month_start
  LEFT JOIN lapse_activity la ON la.month = m.month_start
  LEFT JOIN commission_activity ca ON ca.month = m.month_start
  LEFT JOIN agent_activity aa ON aa.month = m.month_start
  ORDER BY m.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_performance_report(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_agency_performance_report(uuid, date, date) IS
'Returns monthly performance metrics for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Includes new policies, commissions, agent growth, and running totals.
Date filtering uses COALESCE(submit_date, created_at) for accurate production tracking.
Requires agency owner, IMO admin (same IMO), or super admin role.';


-- ============================================================================
-- 3. Fix get_agency_weekly_production
-- Changes:
--   - policy_activity CTE: effective_date -> COALESCE(submit_date, created_at)
--   - base_totals CTE: effective_date -> COALESCE(submit_date, created_at)
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_weekly_production(uuid, date, date);

CREATE OR REPLACE FUNCTION get_agency_weekly_production(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 weeks')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  week_start date,
  week_end date,
  week_label text,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  policies_lapsed bigint,
  lapsed_premium numeric,
  net_premium_change numeric,
  running_total_policies bigint,
  running_total_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
BEGIN
  -- Determine which agency to query
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = '22023';
  END IF;

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check: must be agency owner, IMO admin (same IMO), or super admin
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH weeks AS (
    SELECT
      date_trunc('week', d)::date AS week_start,
      (date_trunc('week', d) + INTERVAL '6 days')::date AS week_end
    FROM generate_series(
      date_trunc('week', p_start_date)::date,
      date_trunc('week', p_end_date)::date,
      INTERVAL '1 week'
    ) AS d
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  policy_activity AS (
    SELECT
      date_trunc('week', COALESCE(p.submit_date, p.created_at))::date AS week,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('week', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('week', p.status_change_date)::date AS week,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.status = 'lapsed'
      AND p.status_change_date >= p_start_date
      AND p.status_change_date <= p_end_date
    GROUP BY date_trunc('week', p.status_change_date)::date
  ),
  commission_activity AS (
    SELECT
      date_trunc('week', c.payment_date)::date AS week,
      COALESCE(SUM(c.earned_amount), 0) AS commissions_earned
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY date_trunc('week', c.payment_date)::date
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
  )
  SELECT
    w.week_start,
    w.week_end,
    to_char(w.week_start, 'Mon DD') AS week_label,
    COALESCE(pa.new_policies, 0)::bigint AS new_policies,
    COALESCE(pa.new_premium, 0)::numeric AS new_premium,
    COALESCE(ca.commissions_earned, 0)::numeric AS commissions_earned,
    COALESCE(la.policies_lapsed, 0)::bigint AS policies_lapsed,
    COALESCE(la.lapsed_premium, 0)::numeric AS lapsed_premium,
    (COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0))::numeric AS net_premium_change,
    (bt.initial_policies + SUM(COALESCE(pa.new_policies, 0) - COALESCE(la.policies_lapsed, 0)) OVER (ORDER BY w.week_start))::bigint AS running_total_policies,
    (bt.initial_premium + SUM(COALESCE(pa.new_premium, 0) - COALESCE(la.lapsed_premium, 0)) OVER (ORDER BY w.week_start))::numeric AS running_total_premium
  FROM weeks w
  CROSS JOIN base_totals bt
  LEFT JOIN policy_activity pa ON pa.week = w.week_start
  LEFT JOIN lapse_activity la ON la.week = w.week_start
  LEFT JOIN commission_activity ca ON ca.week = w.week_start
  ORDER BY w.week_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_weekly_production(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_agency_weekly_production(uuid, date, date) IS
'Returns weekly production metrics for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Includes new policies, commissions, lapse activity, and running totals.
Date filtering uses COALESCE(submit_date, created_at) for accurate production tracking.
Requires agency owner, IMO admin (same IMO), or super admin role.';


-- ============================================================================
-- 4. Fix get_imo_production_by_agency
-- Changes:
--   - v_total_imo_premium calculation: effective_date -> COALESCE(submit_date, created_at)
--   - policy_stats CTE: effective_date -> COALESCE(submit_date, created_at)
-- Note: Also includes the agent count role filtering from migration 20260201150609
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

  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  -- Get total IMO premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.status = 'active'
    AND COALESCE(p.submit_date, p.created_at) >= p_start_date
    AND COALESCE(p.submit_date, p.created_at) <= p_end_date;

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
    -- Exclude pure recruits from team member count
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
    )
  ),
  -- FIX: Use COALESCE(submit_date, created_at) instead of effective_date
  policy_stats AS (
    -- Active policies within date range
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as policy_count,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.status = 'active'
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
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
Date filtering uses COALESCE(submit_date, created_at) for accurate production tracking.
Agent counts exclude pure recruits (those with recruit role but no agent role).

Fields returned:
  - agency_id, agency_name, agency_code, owner_name
  - new_policies, policies_lapsed, retention_rate
  - new_premium, commissions_earned
  - agent_count, avg_premium_per_agent
  - rank_by_premium, rank_by_policies, pct_of_imo_premium

Requires IMO admin, IMO owner, or super admin role.';
