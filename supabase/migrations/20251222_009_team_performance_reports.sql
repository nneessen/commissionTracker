-- Migration: Team Performance Reports
-- Phase 6 of org-awareness implementation
-- Provides time-series performance reports for IMO admins and agency owners

-- =====================================================
-- IMO Performance Report (Monthly Trends)
-- =====================================================

DROP FUNCTION IF EXISTS get_imo_performance_report(date, date);

-- Returns monthly performance metrics for the current user's IMO
-- Only accessible to IMO admins, IMO owners, and super admins
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
  policy_activity AS (
    SELECT
      date_trunc('month', p.effective_date)::date AS month,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY date_trunc('month', p.effective_date)::date
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
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date), 0) AS initial_premium
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
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- Agency Performance Report (Monthly Trends)
-- =====================================================

DROP FUNCTION IF EXISTS get_agency_performance_report(uuid, date, date);

-- Returns monthly performance metrics for a specific agency
-- Accessible to: agency owner, IMO admins (same IMO), super admins
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
  policy_activity AS (
    SELECT
      date_trunc('month', p.effective_date)::date AS month,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY date_trunc('month', p.effective_date)::date
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
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date), 0) AS initial_premium
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
Requires agency owner, IMO admin (same IMO), or super admin role.';


-- =====================================================
-- Team Comparison Report (Agency Rankings)
-- =====================================================

DROP FUNCTION IF EXISTS get_team_comparison_report(date, date);

-- Returns agency comparison metrics for the current user's IMO
-- Only accessible to IMO admins, IMO owners, and super admins
CREATE OR REPLACE FUNCTION get_team_comparison_report(
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  agent_count bigint,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  avg_premium_per_policy numeric,
  avg_premium_per_agent numeric,
  policies_lapsed bigint,
  retention_rate numeric,
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
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
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
  WITH agency_metrics AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.code AS agency_code,
      COALESCE(owner.first_name || ' ' || owner.last_name, owner.email, 'No Owner') AS owner_name,
      COALESCE(agent_stats.agent_count, 0)::bigint AS agent_count,
      COALESCE(policy_stats.new_policies, 0)::bigint AS new_policies,
      COALESCE(policy_stats.new_premium, 0)::numeric AS new_premium,
      COALESCE(commission_stats.commissions_earned, 0)::numeric AS commissions_earned,
      CASE
        WHEN COALESCE(policy_stats.new_policies, 0) > 0
        THEN ROUND(COALESCE(policy_stats.new_premium, 0) / policy_stats.new_policies, 2)
        ELSE 0
      END::numeric AS avg_premium_per_policy,
      CASE
        WHEN COALESCE(agent_stats.agent_count, 0) > 0
        THEN ROUND(COALESCE(policy_stats.new_premium, 0) / agent_stats.agent_count, 2)
        ELSE 0
      END::numeric AS avg_premium_per_agent,
      COALESCE(lapse_stats.policies_lapsed, 0)::bigint AS policies_lapsed,
      CASE
        WHEN (COALESCE(policy_stats.new_policies, 0) + COALESCE(lapse_stats.policies_lapsed, 0)) > 0
        THEN ROUND(
          COALESCE(policy_stats.new_policies, 0)::numeric /
          (COALESCE(policy_stats.new_policies, 0) + COALESCE(lapse_stats.policies_lapsed, 0)) * 100
        , 1)
        ELSE 100
      END::numeric AS retention_rate
    FROM agencies a
    LEFT JOIN user_profiles owner ON a.owner_id = owner.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS agent_count
      FROM user_profiles up
      WHERE up.agency_id = a.id
        AND up.approval_status = 'approved'
        AND up.archived_at IS NULL
    ) agent_stats ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS new_policies,
        SUM(p.annual_premium) AS new_premium
      FROM policies p
      INNER JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = a.id
        AND p.status = 'active'
        AND p.effective_date >= p_start_date
        AND p.effective_date <= p_end_date
    ) policy_stats ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS policies_lapsed
      FROM policies p
      INNER JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = a.id
        AND p.status = 'lapsed'
        AND p.status_change_date >= p_start_date
        AND p.status_change_date <= p_end_date
    ) lapse_stats ON true
    LEFT JOIN LATERAL (
      SELECT SUM(c.earned_amount) AS commissions_earned
      FROM commissions c
      INNER JOIN user_profiles up ON c.user_id = up.id
      WHERE up.agency_id = a.id
        AND c.payment_date >= p_start_date
        AND c.payment_date <= p_end_date
    ) commission_stats ON true
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  )
  SELECT
    am.agency_id,
    am.agency_name,
    am.agency_code,
    am.owner_name,
    am.agent_count,
    am.new_policies,
    am.new_premium,
    am.commissions_earned,
    am.avg_premium_per_policy,
    am.avg_premium_per_agent,
    am.policies_lapsed,
    am.retention_rate,
    RANK() OVER (ORDER BY am.new_premium DESC)::integer AS rank_by_premium,
    RANK() OVER (ORDER BY am.new_policies DESC)::integer AS rank_by_policies,
    CASE
      WHEN v_total_imo_premium > 0
      THEN ROUND(am.new_premium / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric AS pct_of_imo_premium
  FROM agency_metrics am
  ORDER BY am.new_premium DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_comparison_report(date, date) TO authenticated;

COMMENT ON FUNCTION get_team_comparison_report(date, date) IS
'Returns agency comparison metrics for the current user''s IMO.
Includes rankings by premium and policies, retention rates, and percent of IMO production.
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- Top Performers Report (Agent Rankings within IMO)
-- =====================================================

DROP FUNCTION IF EXISTS get_top_performers_report(integer, date, date);

-- Returns top performing agents across the IMO
-- Only accessible to IMO admins, IMO owners, and super admins
CREATE OR REPLACE FUNCTION get_top_performers_report(
  p_limit integer DEFAULT 20,
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  agency_name text,
  agency_id uuid,
  contract_level integer,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  avg_premium_per_policy numeric,
  rank_in_imo integer,
  rank_in_agency integer
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
  WITH agent_performance AS (
    SELECT
      up.id AS agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS agent_name,
      up.email AS agent_email,
      a.name AS agency_name,
      a.id AS agency_id,
      up.contract_level,
      COALESCE(policy_stats.new_policies, 0)::bigint AS new_policies,
      COALESCE(policy_stats.new_premium, 0)::numeric AS new_premium,
      COALESCE(commission_stats.commissions_earned, 0)::numeric AS commissions_earned,
      CASE
        WHEN COALESCE(policy_stats.new_policies, 0) > 0
        THEN ROUND(COALESCE(policy_stats.new_premium, 0) / policy_stats.new_policies, 2)
        ELSE 0
      END::numeric AS avg_premium_per_policy
    FROM user_profiles up
    INNER JOIN agencies a ON up.agency_id = a.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS new_policies,
        SUM(p.annual_premium) AS new_premium
      FROM policies p
      WHERE p.user_id = up.id
        AND p.status = 'active'
        AND p.effective_date >= p_start_date
        AND p.effective_date <= p_end_date
    ) policy_stats ON true
    LEFT JOIN LATERAL (
      SELECT SUM(c.earned_amount) AS commissions_earned
      FROM commissions c
      WHERE c.user_id = up.id
        AND c.payment_date >= p_start_date
        AND c.payment_date <= p_end_date
    ) commission_stats ON true
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  )
  SELECT
    ap.agent_id,
    ap.agent_name,
    ap.agent_email,
    ap.agency_name,
    ap.agency_id,
    ap.contract_level,
    ap.new_policies,
    ap.new_premium,
    ap.commissions_earned,
    ap.avg_premium_per_policy,
    RANK() OVER (ORDER BY ap.new_premium DESC)::integer AS rank_in_imo,
    RANK() OVER (PARTITION BY ap.agency_id ORDER BY ap.new_premium DESC)::integer AS rank_in_agency
  FROM agent_performance ap
  WHERE ap.new_premium > 0
  ORDER BY ap.new_premium DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_performers_report(integer, date, date) TO authenticated;

COMMENT ON FUNCTION get_top_performers_report(integer, date, date) IS
'Returns top performing agents across the current user''s IMO.
Includes rankings within IMO and within their agency.
Requires IMO admin, IMO owner, or super admin role.';
