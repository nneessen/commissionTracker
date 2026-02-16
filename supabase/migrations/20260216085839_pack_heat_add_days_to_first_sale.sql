-- supabase/migrations/20260216085839_pack_heat_add_days_to_first_sale.sql
-- Add days_to_first_sale to get_lead_pack_heat_metrics RPC
-- Returns -1 when pack has no policies, 0+ for actual days from purchase to first sale

DROP FUNCTION IF EXISTS get_lead_pack_heat_metrics(uuid);

CREATE OR REPLACE FUNCTION get_lead_pack_heat_metrics(
  p_imo_id uuid DEFAULT NULL
)
RETURNS TABLE (
  pack_id uuid,
  vendor_id uuid,
  total_premium numeric,
  total_cost numeric,
  lead_count integer,
  policies_sold integer,
  commission_earned numeric,
  days_since_purchase integer,
  days_since_last_sale integer,
  sales_last_30d integer,
  days_to_first_sale integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.id as pack_id,
    lp.vendor_id,
    COALESCE((
      SELECT SUM(p.annual_premium)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), 0) as total_premium,
    lp.total_cost,
    lp.lead_count,
    lp.policies_sold,
    lp.commission_earned,
    (CURRENT_DATE - lp.purchase_date)::integer as days_since_purchase,
    COALESCE((
      SELECT (CURRENT_DATE - MAX(p.submit_date)::date)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), 999)::integer as days_since_last_sale,
    COALESCE((
      SELECT COUNT(*)
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
        AND p.submit_date >= (CURRENT_DATE - INTERVAL '30 days')
    ), 0)::integer as sales_last_30d,
    COALESCE((
      SELECT (MIN(p.submit_date)::date - lp.purchase_date)::integer
      FROM policies p
      WHERE p.lead_purchase_id = lp.id
    ), -1)::integer as days_to_first_sale
  FROM lead_purchases lp
  INNER JOIN lead_vendors lv ON lv.id = lp.vendor_id
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id());
$$;
