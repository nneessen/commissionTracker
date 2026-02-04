-- supabase/migrations/20260204153334_fix_lifecycle_status_final_batch.sql
-- Fix remaining RPC functions to use lifecycle_status instead of status for active policy checks
--
-- This migration updates the final batch of 11 functions that still use p.status = 'active'.
-- Pattern applied:
-- - p.status = 'active' -> p.lifecycle_status = 'active'
-- - p.status = 'lapsed' -> p.lifecycle_status = 'lapsed'
-- - p.status = 'pending' -> UNCHANGED (application outcome, correct as-is)

-- ============================================================================
-- 1. get_imo_performance_report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_imo_performance_report(
  p_start_date date DEFAULT ((CURRENT_DATE - '1 year'::interval))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

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
      date_trunc('month', COALESCE(p.submit_date, p.created_at))::date AS month,
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active'), 0) AS new_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('month', p.cancellation_date)::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
      AND p.lifecycle_status = 'lapsed'
      AND p.cancellation_date >= p_start_date
      AND p.cancellation_date <= p_end_date
    GROUP BY date_trunc('month', p.cancellation_date)::date
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
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
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
$function$;

-- ============================================================================
-- 2. get_agency_performance_report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_agency_performance_report(
  p_agency_id uuid DEFAULT NULL::uuid,
  p_start_date date DEFAULT ((CURRENT_DATE - '1 year'::interval))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
BEGIN
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = '22023';
  END IF;

  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

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
      date_trunc('month', COALESCE(p.submit_date, p.created_at))::date AS month,
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active'), 0) AS new_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('month', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('month', p.cancellation_date)::date AS month,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
      AND p.lifecycle_status = 'lapsed'
      AND p.cancellation_date >= p_start_date
      AND p.cancellation_date <= p_end_date
    GROUP BY date_trunc('month', p.cancellation_date)::date
  ),
  commission_activity AS (
    SELECT
      date_trunc('month', c.payment_date)::date AS month,
      COALESCE(SUM(c.earned_amount), 0) AS commissions_earned
    FROM commissions c
    JOIN policies p ON p.id = c.policy_id
    WHERE p.agency_id = v_agency_id
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
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
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
$function$;

-- ============================================================================
-- 3. get_agency_weekly_production
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_agency_weekly_production(
  p_agency_id uuid DEFAULT NULL::uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '12 weeks')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
BEGIN
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = '22023';
  END IF;

  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

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
    ) d
  ),
  policy_activity AS (
    SELECT
      date_trunc('week', COALESCE(p.submit_date, p.created_at))::date AS week,
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active'), 0) AS new_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY date_trunc('week', COALESCE(p.submit_date, p.created_at))::date
  ),
  lapse_activity AS (
    SELECT
      date_trunc('week', p.cancellation_date)::date AS week,
      COUNT(*) AS policies_lapsed,
      COALESCE(SUM(p.annual_premium), 0) AS lapsed_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
      AND p.lifecycle_status = 'lapsed'
      AND p.cancellation_date >= p_start_date
      AND p.cancellation_date <= p_end_date
    GROUP BY date_trunc('week', p.cancellation_date)::date
  ),
  commission_activity AS (
    SELECT
      date_trunc('week', c.payment_date)::date AS week,
      COALESCE(SUM(c.earned_amount), 0) AS commissions_earned
    FROM commissions c
    JOIN policies p ON p.id = c.policy_id
    WHERE p.agency_id = v_agency_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY date_trunc('week', c.payment_date)::date
  ),
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active' AND COALESCE(p.submit_date, p.created_at) < p_start_date), 0) AS initial_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
  )
  SELECT
    w.week_start,
    w.week_end,
    'Week ' || to_char(w.week_start, 'MM/DD') AS week_label,
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
$function$;

-- ============================================================================
-- 4. get_team_comparison_report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_team_comparison_report(
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
  v_total_imo_premium numeric;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.lifecycle_status = 'active'
    AND COALESCE(p.submit_date, p.created_at) >= p_start_date
    AND COALESCE(p.submit_date, p.created_at) <= p_end_date;

  RETURN QUERY
  WITH agency_stats AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.code AS agency_code,
      COALESCE(up.first_name || ' ' || up.last_name, up.email, 'No Owner') AS owner_name,
      (
        SELECT COUNT(DISTINCT u.id)
        FROM user_profiles u
        WHERE u.agency_id = a.id
          AND u.approval_status = 'approved'
          AND u.archived_at IS NULL
      )::bigint AS agent_count,
      COUNT(DISTINCT CASE WHEN p.lifecycle_status = 'active'
        AND COALESCE(p.submit_date, p.created_at) >= p_start_date
        AND COALESCE(p.submit_date, p.created_at) <= p_end_date THEN p.id END)::bigint AS new_policies,
      COALESCE(SUM(CASE WHEN p.lifecycle_status = 'active'
        AND COALESCE(p.submit_date, p.created_at) >= p_start_date
        AND COALESCE(p.submit_date, p.created_at) <= p_end_date THEN p.annual_premium ELSE 0 END), 0)::numeric AS new_premium,
      (
        SELECT COALESCE(SUM(c.earned_amount), 0)
        FROM commissions c
        JOIN policies pol ON pol.id = c.policy_id
        WHERE pol.agency_id = a.id
          AND c.payment_date >= p_start_date
          AND c.payment_date <= p_end_date
      )::numeric AS commissions_earned,
      COUNT(DISTINCT CASE WHEN p.lifecycle_status = 'lapsed'
        AND p.cancellation_date >= p_start_date
        AND p.cancellation_date <= p_end_date THEN p.id END)::bigint AS policies_lapsed
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    LEFT JOIN policies p ON p.agency_id = a.id
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
    GROUP BY a.id, a.name, a.code, up.first_name, up.last_name, up.email
  )
  SELECT
    s.agency_id,
    s.agency_name,
    s.agency_code,
    s.owner_name,
    s.agent_count,
    s.new_policies,
    s.new_premium,
    s.commissions_earned,
    CASE WHEN s.new_policies > 0 THEN ROUND(s.new_premium / s.new_policies, 2) ELSE 0 END::numeric AS avg_premium_per_policy,
    CASE WHEN s.agent_count > 0 THEN ROUND(s.new_premium / s.agent_count, 2) ELSE 0 END::numeric AS avg_premium_per_agent,
    s.policies_lapsed,
    CASE WHEN (s.new_policies + s.policies_lapsed) > 0
      THEN ROUND(s.new_policies::numeric / (s.new_policies + s.policies_lapsed) * 100, 1)
      ELSE 100
    END::numeric AS retention_rate,
    RANK() OVER (ORDER BY s.new_premium DESC)::integer AS rank_by_premium,
    RANK() OVER (ORDER BY s.new_policies DESC)::integer AS rank_by_policies,
    CASE WHEN v_total_imo_premium > 0 THEN ROUND(s.new_premium / v_total_imo_premium * 100, 1) ELSE 0 END::numeric AS pct_of_imo_premium
  FROM agency_stats s
  WHERE s.agent_count > 0
  ORDER BY s.new_premium DESC;
END;
$function$;

-- ============================================================================
-- 5. get_top_performers_report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_performers_report(
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  agent_id uuid,
  agent_name text,
  agency_id uuid,
  agency_name text,
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH agent_stats AS (
    SELECT
      up.id AS agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS agent_name,
      up.agency_id,
      a.name AS agency_name,
      up.contract_level,
      COUNT(DISTINCT CASE WHEN p.lifecycle_status = 'active'
        AND COALESCE(p.submit_date, p.created_at) >= p_start_date
        AND COALESCE(p.submit_date, p.created_at) <= p_end_date THEN p.id END)::bigint AS new_policies,
      COALESCE(SUM(CASE WHEN p.lifecycle_status = 'active'
        AND COALESCE(p.submit_date, p.created_at) >= p_start_date
        AND COALESCE(p.submit_date, p.created_at) <= p_end_date THEN p.annual_premium ELSE 0 END), 0)::numeric AS new_premium,
      COALESCE(SUM(c.earned_amount) FILTER (
        WHERE c.payment_date >= p_start_date AND c.payment_date <= p_end_date
      ), 0)::numeric AS commissions_earned
    FROM user_profiles up
    LEFT JOIN agencies a ON a.id = up.agency_id
    LEFT JOIN policies p ON p.user_id = up.id
    LEFT JOIN commissions c ON c.policy_id = p.id
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
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
    GROUP BY up.id, up.first_name, up.last_name, up.email, up.agency_id, a.name, up.contract_level
  ),
  ranked AS (
    SELECT
      s.*,
      CASE WHEN s.new_policies > 0 THEN ROUND(s.new_premium / s.new_policies, 2) ELSE 0 END::numeric AS avg_premium_per_policy,
      RANK() OVER (ORDER BY s.new_premium DESC)::integer AS rank_in_imo,
      RANK() OVER (PARTITION BY s.agency_id ORDER BY s.new_premium DESC)::integer AS rank_in_agency
    FROM agent_stats s
  )
  SELECT
    r.agent_id,
    r.agent_name,
    r.agency_id,
    r.agency_name,
    r.contract_level,
    r.new_policies,
    r.new_premium,
    r.commissions_earned,
    r.avg_premium_per_policy,
    r.rank_in_imo,
    r.rank_in_agency
  FROM ranked r
  WHERE r.new_premium > 0
  ORDER BY r.new_premium DESC
  LIMIT p_limit;
END;
$function$;

-- ============================================================================
-- 6. build_agency_org_chart
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_agency_org_chart(
  p_agency_id uuid,
  p_include_metrics boolean,
  p_max_depth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_agency_record record;
    v_sub_agencies jsonb;
    v_agents jsonb;
    v_metrics jsonb;
BEGIN
    IF p_max_depth < 0 THEN
        RETURN NULL;
    END IF;

    SELECT a.id, a.name, a.code, a.logo_url, a.owner_id,
           up.first_name || ' ' || up.last_name as owner_name,
           up.email as owner_email
    INTO v_agency_record
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    WHERE a.id = p_agency_id AND a.is_active = true;

    IF v_agency_record IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_agg(sub_agency_chart ORDER BY sub_agency_chart->>'name')
    INTO v_sub_agencies
    FROM (
        SELECT build_agency_org_chart(a.id, p_include_metrics, p_max_depth - 1) as sub_agency_chart
        FROM agencies a
        WHERE a.parent_agency_id = p_agency_id
        AND a.is_active = true
    ) sub
    WHERE sub_agency_chart IS NOT NULL;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', up.id,
            'type', 'agent',
            'name', COALESCE(up.first_name || ' ' || up.last_name, up.email),
            'email', up.email,
            'contractLevel', up.contract_level,
            'agentStatus', up.agent_status,
            'profilePhotoUrl', up.profile_photo_url,
            'hierarchyDepth', up.hierarchy_depth,
            'metrics', CASE WHEN p_include_metrics THEN
                jsonb_build_object(
                    'activePolicyCount', COALESCE(policy_data.cnt, 0),
                    'totalAnnualPremium', COALESCE(policy_data.premium, 0),
                    'totalCommissionsYtd', COALESCE(commission_data.ytd, 0)
                )
            ELSE '{}'::jsonb END,
            'children', COALESCE(build_agent_downline_tree(up.id, p_include_metrics, p_max_depth - 1), '[]'::jsonb)
        ) ORDER BY up.first_name, up.last_name, up.email
    )
    INTO v_agents
    FROM user_profiles up
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
        FROM policies p
        WHERE p.user_id = up.id AND p.lifecycle_status = 'active'
    ) policy_data ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
        FROM commissions c
        JOIN policies p ON c.policy_id = p.id
        WHERE p.user_id = up.id
        AND c.created_at >= date_trunc('year', CURRENT_DATE)
    ) commission_data ON true
    WHERE up.agency_id = p_agency_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL
    AND up.upline_id IS NULL;

    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'agentCount', COALESCE(COUNT(DISTINCT up.id), 0),
            'activePolicyCount', COALESCE(SUM(policy_counts.cnt), 0),
            'totalAnnualPremium', COALESCE(SUM(policy_counts.premium), 0),
            'totalCommissionsYtd', COALESCE(SUM(commission_totals.ytd), 0),
            'avgContractLevel', COALESCE(ROUND(AVG(up.contract_level)::numeric, 0), 0)
        )
        INTO v_metrics
        FROM user_profiles up
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
            FROM policies p
            WHERE p.user_id = up.id AND p.lifecycle_status = 'active'
        ) policy_counts ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
            FROM commissions c
            JOIN policies p ON c.policy_id = p.id
            WHERE p.user_id = up.id
            AND c.created_at >= date_trunc('year', CURRENT_DATE)
        ) commission_totals ON true
        WHERE up.agency_id = p_agency_id
        AND up.approval_status = 'approved'
        AND up.archived_at IS NULL;
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'id', v_agency_record.id,
        'type', 'agency',
        'name', v_agency_record.name,
        'code', v_agency_record.code,
        'logoUrl', v_agency_record.logo_url,
        'ownerId', v_agency_record.owner_id,
        'ownerName', v_agency_record.owner_name,
        'ownerEmail', v_agency_record.owner_email,
        'metrics', v_metrics,
        'children', COALESCE(v_sub_agencies, '[]'::jsonb) || COALESCE(v_agents, '[]'::jsonb)
    );
END;
$function$;

-- ============================================================================
-- 7. build_agent_downline_tree
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_agent_downline_tree(
  p_agent_id uuid,
  p_include_metrics boolean,
  p_max_depth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_children jsonb;
BEGIN
    IF p_max_depth < 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', up.id,
            'type', 'agent',
            'name', COALESCE(up.first_name || ' ' || up.last_name, up.email),
            'email', up.email,
            'contractLevel', up.contract_level,
            'agentStatus', up.agent_status,
            'profilePhotoUrl', up.profile_photo_url,
            'hierarchyDepth', up.hierarchy_depth,
            'metrics', CASE WHEN p_include_metrics THEN
                jsonb_build_object(
                    'activePolicyCount', COALESCE(policy_data.cnt, 0),
                    'totalAnnualPremium', COALESCE(policy_data.premium, 0),
                    'totalCommissionsYtd', COALESCE(commission_data.ytd, 0)
                )
            ELSE '{}'::jsonb END,
            'children', COALESCE(build_agent_downline_tree(up.id, p_include_metrics, p_max_depth - 1), '[]'::jsonb)
        ) ORDER BY up.first_name, up.last_name, up.email
    )
    INTO v_children
    FROM user_profiles up
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
        FROM policies p
        WHERE p.user_id = up.id AND p.lifecycle_status = 'active'
    ) policy_data ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
        FROM commissions c
        JOIN policies p ON c.policy_id = p.id
        WHERE p.user_id = up.id
        AND c.created_at >= date_trunc('year', CURRENT_DATE)
    ) commission_data ON true
    WHERE up.upline_id = p_agent_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL;

    RETURN COALESCE(v_children, '[]'::jsonb);
END;
$function$;

-- ============================================================================
-- 8. build_agent_org_chart
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_agent_org_chart(
  p_agent_id uuid,
  p_include_metrics boolean,
  p_max_depth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_agent_record record;
    v_metrics jsonb;
    v_children jsonb;
BEGIN
    IF p_max_depth < 0 THEN
        RETURN NULL;
    END IF;

    SELECT
        up.id,
        COALESCE(up.first_name || ' ' || up.last_name, up.email) as name,
        up.email,
        up.contract_level,
        up.agent_status,
        up.profile_photo_url,
        up.hierarchy_depth
    INTO v_agent_record
    FROM user_profiles up
    WHERE up.id = p_agent_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL;

    IF v_agent_record IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'activePolicyCount', COALESCE(COUNT(*), 0),
            'totalAnnualPremium', COALESCE(SUM(p.annual_premium), 0),
            'totalCommissionsYtd', (
                SELECT COALESCE(SUM(c.earned_amount), 0)
                FROM commissions c
                WHERE c.user_id = p_agent_id
                AND c.created_at >= date_trunc('year', CURRENT_DATE)
            )
        )
        INTO v_metrics
        FROM policies p
        WHERE p.user_id = p_agent_id AND p.lifecycle_status = 'active';
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    v_children := build_agent_downline_tree(p_agent_id, p_include_metrics, p_max_depth - 1);

    RETURN jsonb_build_object(
        'id', v_agent_record.id,
        'type', 'agent',
        'name', v_agent_record.name,
        'email', v_agent_record.email,
        'contractLevel', v_agent_record.contract_level,
        'agentStatus', v_agent_record.agent_status,
        'profilePhotoUrl', v_agent_record.profile_photo_url,
        'hierarchyDepth', v_agent_record.hierarchy_depth,
        'metrics', v_metrics,
        'children', COALESCE(v_children, '[]'::jsonb)
    );
END;
$function$;

-- ============================================================================
-- 9. build_imo_org_chart
-- ============================================================================

CREATE OR REPLACE FUNCTION public.build_imo_org_chart(
  p_imo_id uuid,
  p_include_metrics boolean,
  p_max_depth integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_imo_record record;
    v_agencies jsonb;
    v_metrics jsonb;
BEGIN
    SELECT i.id, i.name, i.logo_url
    INTO v_imo_record
    FROM imos i
    WHERE i.id = p_imo_id;

    IF v_imo_record IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_agg(agency_chart ORDER BY agency_chart->>'name')
    INTO v_agencies
    FROM (
        SELECT build_agency_org_chart(a.id, p_include_metrics, p_max_depth - 1) as agency_chart
        FROM agencies a
        WHERE a.imo_id = p_imo_id
        AND a.is_active = true
        AND a.parent_agency_id IS NULL
    ) sub
    WHERE sub.agency_chart IS NOT NULL;

    IF p_include_metrics THEN
        SELECT jsonb_build_object(
            'agencyCount', COALESCE(COUNT(DISTINCT a.id), 0),
            'agentCount', COALESCE(COUNT(DISTINCT up.id), 0),
            'activePolicyCount', COALESCE(SUM(policy_counts.cnt), 0),
            'totalAnnualPremium', COALESCE(SUM(policy_counts.premium), 0),
            'totalCommissionsYtd', COALESCE(SUM(commission_totals.ytd), 0)
        )
        INTO v_metrics
        FROM agencies a
        LEFT JOIN user_profiles up ON up.agency_id = a.id
          AND up.approval_status = 'approved'
          AND up.archived_at IS NULL
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as cnt, SUM(annual_premium) as premium
            FROM policies p
            WHERE p.user_id = up.id AND p.lifecycle_status = 'active'
        ) policy_counts ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(c.earned_amount), 0) as ytd
            FROM commissions c
            JOIN policies p ON c.policy_id = p.id
            WHERE p.user_id = up.id
            AND c.created_at >= date_trunc('year', CURRENT_DATE)
        ) commission_totals ON true
        WHERE a.imo_id = p_imo_id
        AND a.is_active = true;
    ELSE
        v_metrics := '{}'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'id', v_imo_record.id,
        'type', 'imo',
        'name', v_imo_record.name,
        'logoUrl', v_imo_record.logo_url,
        'metrics', v_metrics,
        'children', COALESCE(v_agencies, '[]'::jsonb)
    );
END;
$function$;

-- ============================================================================
-- 10. get_policies_for_lapse_check (DROP and recreate with correct signature)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_policies_for_lapse_check(uuid, uuid[], integer);

CREATE OR REPLACE FUNCTION public.get_policies_for_lapse_check(
  p_rule_id uuid,
  p_user_ids uuid[],
  p_warning_days integer
)
RETURNS TABLE(
  policy_id uuid,
  policy_number text,
  user_id uuid,
  user_name text,
  user_email text,
  annual_premium numeric,
  effective_date date,
  days_until_due integer,
  last_payment_date date,
  carrier_name text,
  product_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id as policy_id,
    p.policy_number,
    p.user_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as user_name,
    up.email as user_email,
    p.annual_premium,
    p.effective_date,
    (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE as days_until_due,
    c.last_payment_date,
    cr.name as carrier_name,
    p.product::text as product_type
  FROM policies p
  JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN commissions c ON c.policy_id = p.id
  LEFT JOIN carriers cr ON cr.id = p.carrier_id
  WHERE p.lifecycle_status = 'active'
    AND p.user_id = ANY(p_user_ids)
    AND p.effective_date IS NOT NULL
    AND p.term_length IS NOT NULL
    AND (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE <= p_warning_days
    AND (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE > 0
  ORDER BY days_until_due ASC;
END;
$function$;

-- ============================================================================
-- 11. getuser_commission_profile
-- ============================================================================

CREATE OR REPLACE FUNCTION public.getuser_commission_profile(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_email text,
  contract_level integer,
  agency_id uuid,
  agency_name text,
  total_policies bigint,
  active_policies bigint,
  total_earned numeric,
  total_unearned numeric,
  total_chargebacks numeric,
  avg_commission_per_policy numeric,
  ytd_earned numeric,
  recent_policies jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_year_start timestamptz;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  RETURN QUERY
  SELECT
    up.id as user_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as user_name,
    up.email as user_email,
    up.contract_level,
    up.agency_id,
    a.name as agency_name,
    COUNT(DISTINCT pol.id)::bigint as total_policies,
    COUNT(DISTINCT CASE WHEN pol.lifecycle_status = 'active' THEN pol.id END)::bigint as active_policies,
    COALESCE(SUM(c.earned_amount), 0)::numeric as total_earned,
    COALESCE(SUM(c.unearned_amount), 0)::numeric as total_unearned,
    COALESCE(SUM(c.chargeback_amount), 0)::numeric as total_chargebacks,
    CASE WHEN COUNT(DISTINCT pol.id) > 0
      THEN ROUND(COALESCE(SUM(c.amount), 0) / COUNT(DISTINCT pol.id), 2)
      ELSE 0
    END::numeric as avg_commission_per_policy,
    COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0)::numeric as ytd_earned,
    (
      SELECT jsonb_agg(recent_pol)
      FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'policyNumber', p.policy_number,
          'annualPremium', p.annual_premium,
          'status', p.status,
          'lifecycleStatus', p.lifecycle_status,
          'effectiveDate', p.effective_date,
          'carrierName', cr.name
        ) as recent_pol
        FROM policies p
        LEFT JOIN carriers cr ON cr.id = p.carrier_id
        WHERE p.user_id = up.id
        ORDER BY p.created_at DESC
        LIMIT 5
      ) rp
    ) as recent_policies
  FROM user_profiles up
  LEFT JOIN agencies a ON a.id = up.agency_id
  LEFT JOIN policies pol ON pol.user_id = up.id
  LEFT JOIN commissions c ON c.policy_id = pol.id
  WHERE up.id = v_user_id
  GROUP BY up.id, up.first_name, up.last_name, up.email, up.contract_level, up.agency_id, a.name;
END;
$function$;

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON FUNCTION get_imo_performance_report IS
'IMO performance report. Uses lifecycle_status for active/lapsed policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION get_agency_performance_report IS
'Agency performance report. Uses lifecycle_status for active/lapsed policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION get_agency_weekly_production IS
'Agency weekly production report. Uses lifecycle_status for active/lapsed policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION get_team_comparison_report IS
'Team comparison report. Uses lifecycle_status for active/lapsed policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION get_top_performers_report IS
'Top performers report. Uses lifecycle_status for active policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION build_agency_org_chart IS
'Builds agency org chart with metrics. Uses lifecycle_status for active policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION build_agent_downline_tree IS
'Builds agent downline tree with metrics. Uses lifecycle_status for active policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION build_agent_org_chart IS
'Builds agent org chart with metrics. Uses lifecycle_status for active policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION build_imo_org_chart IS
'Builds IMO org chart with metrics. Uses lifecycle_status for active policy counts.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION get_policies_for_lapse_check IS
'Returns active policies approaching lapse. Uses lifecycle_status = ''active''.
Fixed in migration 20260204153334.';

COMMENT ON FUNCTION getuser_commission_profile IS
'User commission profile with policy stats. Uses lifecycle_status for active counts.
Fixed in migration 20260204153334.';
