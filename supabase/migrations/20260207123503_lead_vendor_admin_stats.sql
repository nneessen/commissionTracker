-- supabase/migrations/20260207123503_lead_vendor_admin_stats.sql
--
-- 1. Fix broken get_lead_stats_by_vendor_imo_aggregate (references dropped is_active column)
-- 2. New RPC: get_lead_vendor_admin_overview (full vendor overview for admin tab)
-- 3. New RPC: get_lead_vendor_user_breakdown (per-user drill-down for a vendor)

-- ============================================================================
-- 1. Fix: get_lead_stats_by_vendor_imo_aggregate
--    Bug: References lv.is_active which was dropped in vendor_hard_delete migration
--    Also: Add COALESCE(p_imo_id, get_my_imo_id()) fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_stats_by_vendor_imo_aggregate(
  p_imo_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar,
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric,
  unique_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lv.id as vendor_id,
    lv.name as vendor_name,
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
    COUNT(DISTINCT lp.user_id)::bigint as unique_users
  FROM lead_vendors lv
  LEFT JOIN lead_purchases lp ON lp.vendor_id = lv.id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  GROUP BY lv.id, lv.name
  ORDER BY total_spent DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_lead_stats_by_vendor_imo_aggregate(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_stats_by_vendor_imo_aggregate(uuid, date, date) IS
'Returns lead purchase statistics grouped by vendor, aggregated across ALL users in the IMO. Fixed: removed is_active reference, added IMO fallback.';

-- ============================================================================
-- 2. New RPC: get_lead_vendor_admin_overview
--    Returns combined vendor contact info + full performance stats + fresh/aged breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_vendor_admin_overview(
  p_imo_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar,
  contact_name varchar,
  contact_email varchar,
  contact_phone varchar,
  website varchar,
  notes text,
  created_at timestamptz,
  total_purchases bigint,
  total_leads integer,
  total_spent numeric,
  total_policies integer,
  total_commission numeric,
  avg_cost_per_lead numeric,
  avg_roi numeric,
  conversion_rate numeric,
  unique_users bigint,
  fresh_leads integer,
  aged_leads integer,
  fresh_spent numeric,
  aged_spent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lv.id as vendor_id,
    lv.name as vendor_name,
    lv.contact_name,
    lv.contact_email,
    lv.contact_phone,
    lv.website,
    lv.notes,
    lv.created_at,
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
    COUNT(DISTINCT lp.user_id)::bigint as unique_users,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'fresh' THEN lp.lead_count ELSE 0 END), 0)::integer as fresh_leads,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'aged' THEN lp.lead_count ELSE 0 END), 0)::integer as aged_leads,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'fresh' THEN lp.total_cost ELSE 0 END), 0) as fresh_spent,
    COALESCE(SUM(CASE WHEN lp.lead_freshness = 'aged' THEN lp.total_cost ELSE 0 END), 0) as aged_spent
  FROM lead_vendors lv
  LEFT JOIN lead_purchases lp ON lp.vendor_id = lv.id
    AND (p_start_date IS NULL OR lp.purchase_date >= p_start_date)
    AND (p_end_date IS NULL OR lp.purchase_date <= p_end_date)
  WHERE lv.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  GROUP BY lv.id, lv.name, lv.contact_name, lv.contact_email,
           lv.contact_phone, lv.website, lv.notes, lv.created_at
  ORDER BY total_spent DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_admin_overview(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_admin_overview(uuid, date, date) IS
'Returns vendor overview with contact info, performance stats, and fresh/aged breakdown for admin Lead Vendors tab.';

-- ============================================================================
-- 3. New RPC: get_lead_vendor_user_breakdown
--    Per-user drill-down for a specific vendor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_vendor_user_breakdown(
  p_vendor_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
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
  ORDER BY total_spent DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_lead_vendor_user_breakdown(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_vendor_user_breakdown(uuid, date, date) IS
'Returns per-user breakdown of lead purchase stats for a specific vendor. Used in admin Lead Vendors tab drill-down.';
