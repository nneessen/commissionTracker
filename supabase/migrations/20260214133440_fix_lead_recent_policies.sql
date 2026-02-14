-- supabase/migrations/20260214133440_fix_lead_recent_policies.sql
-- Fix: clients table uses 'name' column, not first_name/last_name

CREATE OR REPLACE FUNCTION get_lead_recent_policies(
  p_imo_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  policy_id uuid,
  effective_date date,
  submit_date date,
  policy_number varchar,
  client_name text,
  product text,
  annual_premium numeric,
  agent_id uuid,
  agent_name text,
  vendor_id uuid,
  vendor_name varchar,
  pack_id uuid,
  pack_name varchar,
  lead_freshness text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id as policy_id,
    p.effective_date,
    p.submit_date,
    p.policy_number,
    COALESCE(c.name, 'Unknown') as client_name,
    COALESCE(pr.name, '') as product,
    p.annual_premium,
    p.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, 'Unknown') as agent_name,
    lv.id as vendor_id,
    lv.name as vendor_name,
    lp.id as pack_id,
    lp.purchase_name as pack_name,
    lp.lead_freshness::text,
    p.status::text
  FROM policies p
  INNER JOIN lead_purchases lp ON lp.id = p.lead_purchase_id
  INNER JOIN lead_vendors lv ON lv.id = lp.vendor_id
  LEFT JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN products pr ON pr.id = p.product_id
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  ORDER BY COALESCE(p.effective_date, p.submit_date) DESC
  LIMIT p_limit;
$$;
