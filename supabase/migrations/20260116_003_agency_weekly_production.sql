-- supabase/migrations/20260116_003_agency_weekly_production.sql
-- Adds weekly production breakdown for agencies

--------------------------------------------------------------------------------
-- Agency Weekly Production RPC
-- Returns weekly production metrics for a specific agency
--------------------------------------------------------------------------------

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
  policy_activity AS (
    SELECT
      date_trunc('week', p.effective_date)::date AS week,
      COUNT(*) FILTER (WHERE p.status = 'active') AS new_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) AS new_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = v_agency_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY date_trunc('week', p.effective_date)::date
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
  base_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date) AS initial_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active' AND p.effective_date < p_start_date), 0) AS initial_premium
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
Requires agency owner, IMO admin (same IMO), or super admin role.';
