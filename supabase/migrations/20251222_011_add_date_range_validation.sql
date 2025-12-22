-- Migration: Add Date Range Validation to Report Functions
-- Defense-in-depth: Validates date range at SQL level to prevent abuse
-- even if client-side validation is bypassed

-- Maximum allowed months for report queries
-- This should match MAX_REPORT_DATE_RANGE_MONTHS in team-reports.schemas.ts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'max_report_months') THEN
    CREATE DOMAIN max_report_months AS integer DEFAULT 24;
  END IF;
END $$;

-- =====================================================
-- Helper function to validate date range
-- =====================================================

CREATE OR REPLACE FUNCTION validate_report_date_range(
  p_start_date date,
  p_end_date date,
  p_max_months integer DEFAULT 24
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_months_diff integer;
BEGIN
  -- Check start is before end
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date'
      USING ERRCODE = '22023';
  END IF;

  -- Calculate months difference
  v_months_diff := (
    (EXTRACT(YEAR FROM p_end_date) - EXTRACT(YEAR FROM p_start_date)) * 12 +
    (EXTRACT(MONTH FROM p_end_date) - EXTRACT(MONTH FROM p_start_date)) + 1
  )::integer;

  -- Check range doesn't exceed maximum
  IF v_months_diff > p_max_months THEN
    RAISE EXCEPTION 'Date range exceeds maximum of % months (requested: % months)', p_max_months, v_months_diff
      USING ERRCODE = '22023';
  END IF;
END;
$$;

COMMENT ON FUNCTION validate_report_date_range(date, date, integer) IS
'Validates that a date range does not exceed the maximum allowed months.
Used by report functions to prevent abuse via excessively large date ranges.';


-- =====================================================
-- Update IMO Performance Report with validation
-- =====================================================

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
  -- Validate date range (max 24 months)
  PERFORM validate_report_date_range(p_start_date, p_end_date, 24);

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
  SELECT
    COUNT(*),
    COALESCE(SUM(p.annual_premium), 0)
  INTO v_initial_policies, v_initial_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
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


-- =====================================================
-- Update Agency Performance Report with validation
-- =====================================================

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
  -- Validate date range (max 24 months)
  PERFORM validate_report_date_range(p_start_date, p_end_date, 24);

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


-- =====================================================
-- Update Team Comparison Report with validation
-- =====================================================

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
  -- Validate date range (max 24 months)
  PERFORM validate_report_date_range(p_start_date, p_end_date, 24);

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
        AND COALESCE(p.status_change_date, p.updated_at) >= p_start_date
        AND COALESCE(p.status_change_date, p.updated_at) <= p_end_date
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


-- =====================================================
-- Update Top Performers Report with validation
-- =====================================================

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
  v_safe_limit integer;
BEGIN
  -- Validate date range (max 24 months)
  PERFORM validate_report_date_range(p_start_date, p_end_date, 24);

  -- Clamp limit to prevent abuse (1-100)
  v_safe_limit := GREATEST(1, LEAST(p_limit, 100));

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
  LIMIT v_safe_limit;
END;
$$;

-- Grant execute on validation function
GRANT EXECUTE ON FUNCTION validate_report_date_range(date, date, integer) TO authenticated;
