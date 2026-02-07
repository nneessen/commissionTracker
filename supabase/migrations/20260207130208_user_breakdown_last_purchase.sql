-- supabase/migrations/20260207130208_user_breakdown_last_purchase.sql
--
-- Add last_purchase_date to get_lead_vendor_user_breakdown
-- Shows when each agent last purchased from a given vendor
-- Must DROP first because return type changed

DROP FUNCTION IF EXISTS get_lead_vendor_user_breakdown(uuid, date, date);

CREATE OR REPLACE FUNCTION get_lead_vendor_user_breakdown(
  p_vendor_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  last_purchase_date date,
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric,
  fresh_leads integer,
  aged_leads integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.user_id,
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') as user_name,
    MAX(lp.purchase_date) as last_purchase_date,
    COUNT(lp.id)::bigint as total_purchases,
    COALESCE(SUM(lp.lead_count), 0)::integer as total_leads,
    COALESCE(SUM(lp.total_cost), 0) as total_spent,
    COALESCE(SUM(lp.policies_sold), 0)::integer as total_policies,
    COALESCE(SUM(lp.commission_earned), 0) as total_commission,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN SUM(lp.total_cost) / SUM(lp.lead_count)
      ELSE 0
    END as avg_cost_per_lead,
    CASE
      WHEN SUM(lp.total_cost) > 0 THEN ((SUM(lp.commission_earned) - SUM(lp.total_cost)) / SUM(lp.total_cost)) * 100
      ELSE 0
    END as avg_roi,
    CASE
      WHEN SUM(lp.lead_count) > 0 THEN (SUM(lp.policies_sold)::numeric / SUM(lp.lead_count)) * 100
      ELSE 0
    END as conversion_rate,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'fresh' THEN lp.lead_count ELSE 0 END), 0)::integer as fresh_leads,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'aged' THEN lp.lead_count ELSE 0 END), 0)::integer as aged_leads
  FROM lead_purchases lp
  LEFT JOIN user_profiles up ON up.id = lp.user_id
  WHERE lp.vendor_id = p_vendor_id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  GROUP BY lp.user_id, up.first_name, up.last_name
  ORDER BY last_purchase_date DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_user_breakdown(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_user_breakdown(uuid, date, date) IS
'Returns per-user breakdown of lead purchase stats for a specific vendor, including last purchase date per agent.';
