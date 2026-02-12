-- supabase/migrations/20260211194411_lead_vendor_timeline_and_heat.sql
--
-- Two new RPCs for Lead Vendors tab enhancements:
-- 1. get_lead_vendor_policy_timeline — individual policy records per vendor+agent
-- 2. get_lead_vendor_weekly_activity — weekly bucketed activity for heat score computation

-- ============================================================================
-- 1. Policy Timeline: returns individual policies sold from a vendor's leads
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_vendor_policy_timeline(
  p_vendor_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  policy_id uuid,
  policy_number varchar,
  client_name text,
  product text,
  submit_date date,
  effective_date date,
  annual_premium numeric,
  status text,
  agent_id uuid,
  agent_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id as policy_id,
    p.policy_number,
    COALESCE(c.name, 'Unknown') as client_name,
    p.product::text as product,
    p.submit_date::date as submit_date,
    p.effective_date::date as effective_date,
    COALESCE(p.annual_premium, p.monthly_premium * 12) as annual_premium,
    p.status,
    p.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') as agent_name
  FROM policies p
  INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN user_profiles up ON up.id = p.user_id
  WHERE lp.vendor_id = p_vendor_id
    AND (p_user_id IS NULL OR p.user_id = p_user_id)
    AND (p_start_date IS NULL OR p.submit_date >= p_start_date)
    AND (p_end_date IS NULL OR p.submit_date <= p_end_date)
  ORDER BY p.submit_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_policy_timeline(uuid, uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_policy_timeline(uuid, uuid, date, date) IS
'Returns individual policy records linked to a vendor via lead_purchases. Optionally filtered by agent and date range.';

-- ============================================================================
-- 2. Weekly Activity: returns weekly bucketed counts for heat score computation
--    Always returns last 90 days of data regardless of caller's date filters.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_vendor_weekly_activity()
RETURNS TABLE (
  vendor_id uuid,
  week_start date,
  policy_count bigint,
  lead_count bigint,
  premium_total numeric,
  days_since_last_policy integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH vendor_scope AS (
    SELECT id FROM lead_vendors WHERE imo_id = get_my_imo_id()
  ),
  date_range AS (
    SELECT
      (CURRENT_DATE - INTERVAL '90 days')::date as range_start,
      CURRENT_DATE as range_end
  ),
  -- Generate week boundaries for last 90 days
  weeks AS (
    SELECT generate_series(
      date_trunc('week', (SELECT range_start FROM date_range))::date,
      (SELECT range_end FROM date_range),
      '1 week'::interval
    )::date as week_start
  ),
  -- Cross join vendors with weeks to ensure every vendor has every week
  vendor_weeks AS (
    SELECT vs.id as vendor_id, w.week_start
    FROM vendor_scope vs
    CROSS JOIN weeks w
  ),
  -- Count policies per vendor per week
  weekly_policies AS (
    SELECT
      lp.vendor_id,
      date_trunc('week', p.submit_date)::date as week_start,
      COUNT(p.id) as policy_count,
      COALESCE(SUM(COALESCE(p.annual_premium, p.monthly_premium * 12)), 0) as premium_total
    FROM policies p
    INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
    WHERE lp.vendor_id IN (SELECT id FROM vendor_scope)
      AND p.submit_date >= (SELECT range_start FROM date_range)
    GROUP BY lp.vendor_id, date_trunc('week', p.submit_date)::date
  ),
  -- Count leads purchased per vendor per week
  weekly_leads AS (
    SELECT
      lp.vendor_id,
      date_trunc('week', lp.purchase_date)::date as week_start,
      COALESCE(SUM(lp.lead_count), 0) as lead_count
    FROM lead_purchases lp
    WHERE lp.vendor_id IN (SELECT id FROM vendor_scope)
      AND lp.purchase_date >= (SELECT range_start FROM date_range)
    GROUP BY lp.vendor_id, date_trunc('week', lp.purchase_date)::date
  ),
  -- Days since last policy per vendor
  last_policy AS (
    SELECT
      lp.vendor_id,
      MAX(p.submit_date) as last_submit_date
    FROM policies p
    INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
    WHERE lp.vendor_id IN (SELECT id FROM vendor_scope)
    GROUP BY lp.vendor_id
  )
  SELECT
    vw.vendor_id,
    vw.week_start,
    COALESCE(wp.policy_count, 0) as policy_count,
    COALESCE(wl.lead_count, 0) as lead_count,
    COALESCE(wp.premium_total, 0) as premium_total,
    COALESCE(CURRENT_DATE - lpol.last_submit_date::date, 999) as days_since_last_policy
  FROM vendor_weeks vw
  LEFT JOIN weekly_policies wp ON wp.vendor_id = vw.vendor_id AND wp.week_start = vw.week_start
  LEFT JOIN weekly_leads wl ON wl.vendor_id = vw.vendor_id AND wl.week_start = vw.week_start
  LEFT JOIN last_policy lpol ON lpol.vendor_id = vw.vendor_id
  ORDER BY vw.vendor_id, vw.week_start;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_weekly_activity() TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_weekly_activity() IS
'Returns weekly bucketed policy counts, lead counts, and premium totals per vendor for the last 90 days. Used for client-side heat score computation.';
