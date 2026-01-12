-- Migration: Fix Team Performance Reports Running Totals
-- Fixes bugs in policy counting logic:
-- 1. policy_activity was only counting currently-active policies, missing lapsed ones
-- 2. base_totals was using current state instead of historical state
-- 3. Running totals now correctly track point-in-time policy counts

-- =====================================================
-- IMO Performance Report (Fixed)
-- =====================================================

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
  v_initial_policies bigint;
  v_initial_premium numeric;
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

  -- Calculate initial totals BEFORE the report period
  -- Count policies that were effective before start AND (still active OR lapsed after start)
  SELECT
    COUNT(*),
    COALESCE(SUM(p.annual_premium), 0)
  INTO v_initial_policies, v_initial_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.effective_date < p_start_date
    AND (
      p.status = 'active'
      OR (p.status = 'lapsed' AND p.status_change_date >= p_start_date)
    );

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', p_start_date)::date,
      date_trunc('month', p_end_date)::date,
      INTERVAL '1 month'
    )::date AS month_start
  ),
  -- Count ALL policies written in each month (regardless of current status)
  policy_activity AS (
    SELECT
      date_trunc('month', p.effective_date)::date AS month,
      COUNT(*) AS new_policies,
      COALESCE(SUM(p.annual_premium), 0) AS new_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY date_trunc('month', p.effective_date)::date
  ),
  -- Count policies that lapsed in each month
  lapse_activity AS (
    SELECT
      date_trunc('month', COALESCE(p.status_change_date, p.updated_at))::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND p.status = 'lapsed'
      AND COALESCE(p.status_change_date, p.updated_at) >= p_start_date
      AND COALESCE(p.status_change_date, p.updated_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.status_change_date, p.updated_at))::date
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
  monthly_data AS (
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
      (COALESCE(pa.new_policies, 0) - COALESCE(la.policies_lapsed, 0))::bigint AS net_policy_change
    FROM months m
    LEFT JOIN policy_activity pa ON pa.month = m.month_start
    LEFT JOIN lapse_activity la ON la.month = m.month_start
    LEFT JOIN commission_activity ca ON ca.month = m.month_start
    LEFT JOIN agent_activity aa ON aa.month = m.month_start
  )
  SELECT
    md.month_start,
    md.month_label,
    md.new_policies,
    md.new_premium,
    md.commissions_earned,
    md.new_agents,
    md.policies_lapsed,
    md.lapsed_premium,
    md.net_premium_change,
    (v_initial_policies + SUM(md.net_policy_change) OVER (ORDER BY md.month_start ROWS UNBOUNDED PRECEDING))::bigint AS running_total_policies,
    (v_initial_premium + SUM(md.net_premium_change) OVER (ORDER BY md.month_start ROWS UNBOUNDED PRECEDING))::numeric AS running_total_premium
  FROM monthly_data md
  ORDER BY md.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_performance_report(date, date) TO authenticated;

COMMENT ON FUNCTION get_imo_performance_report(date, date) IS
'Returns monthly performance metrics for the current user''s IMO.
Includes new policies, commissions, agent growth, and running totals.
Fixed: Now correctly counts all policies written (not just currently active).
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- Agency Performance Report (Fixed)
-- =====================================================

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
  v_initial_policies bigint;
  v_initial_premium numeric;
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

  -- Calculate initial totals BEFORE the report period
  SELECT
    COUNT(*),
    COALESCE(SUM(p.annual_premium), 0)
  INTO v_initial_policies, v_initial_premium
  FROM policies p
  INNER JOIN user_profiles up ON p.user_id = up.id
  WHERE up.agency_id = v_agency_id
    AND p.effective_date < p_start_date
    AND (
      p.status = 'active'
      OR (p.status = 'lapsed' AND COALESCE(p.status_change_date, p.updated_at) >= p_start_date)
    );

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', p_start_date)::date,
      date_trunc('month', p_end_date)::date,
      INTERVAL '1 month'
    )::date AS month_start
  ),
  -- Count ALL policies written in each month (regardless of current status)
  policy_activity AS (
    SELECT
      date_trunc('month', p.effective_date)::date AS month,
      COUNT(*) AS new_policies,
      COALESCE(SUM(p.annual_premium), 0) AS new_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY date_trunc('month', p.effective_date)::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('month', COALESCE(p.status_change_date, p.updated_at))::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.status = 'lapsed'
      AND COALESCE(p.status_change_date, p.updated_at) >= p_start_date
      AND COALESCE(p.status_change_date, p.updated_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.status_change_date, p.updated_at))::date
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
  monthly_data AS (
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
      (COALESCE(pa.new_policies, 0) - COALESCE(la.policies_lapsed, 0))::bigint AS net_policy_change
    FROM months m
    LEFT JOIN policy_activity pa ON pa.month = m.month_start
    LEFT JOIN lapse_activity la ON la.month = m.month_start
    LEFT JOIN commission_activity ca ON ca.month = m.month_start
    LEFT JOIN agent_activity aa ON aa.month = m.month_start
  )
  SELECT
    md.month_start,
    md.month_label,
    md.new_policies,
    md.new_premium,
    md.commissions_earned,
    md.new_agents,
    md.policies_lapsed,
    md.lapsed_premium,
    md.net_premium_change,
    (v_initial_policies + SUM(md.net_policy_change) OVER (ORDER BY md.month_start ROWS UNBOUNDED PRECEDING))::bigint AS running_total_policies,
    (v_initial_premium + SUM(md.net_premium_change) OVER (ORDER BY md.month_start ROWS UNBOUNDED PRECEDING))::numeric AS running_total_premium
  FROM monthly_data md
  ORDER BY md.month_start;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_performance_report(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_agency_performance_report(uuid, date, date) IS
'Returns monthly performance metrics for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Fixed: Now correctly counts all policies written (not just currently active).
Requires agency owner, IMO admin (same IMO), or super admin role.';
