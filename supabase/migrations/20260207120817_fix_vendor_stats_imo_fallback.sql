-- supabase/migrations/20260207120817_fix_vendor_stats_imo_fallback.sql
--
-- Fix: get_vendors_with_stats returns 0 rows because p_imo_id=NULL
-- breaks the WHERE clause (NULL = NULL is false in SQL).
--
-- Root cause: Migration 20260121134419_vendor_hard_delete.sql removed
-- the COALESCE(p_imo_id, get_my_imo_id()) fallback from the original
-- function in 20260106_001_lead_vendor_imo_aggregate.sql.
--
-- Fix: Restore COALESCE so NULL p_imo_id defaults to current user's IMO.

DROP FUNCTION IF EXISTS get_vendors_with_stats(uuid, boolean);

CREATE OR REPLACE FUNCTION get_vendors_with_stats(
  p_imo_id uuid DEFAULT NULL,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar(255),
  contact_name varchar(255),
  contact_email varchar(255),
  contact_phone varchar(50),
  website varchar(500),
  created_at timestamptz,
  created_by uuid,
  total_purchases bigint,
  total_spent numeric,
  unique_users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    v.id as vendor_id,
    v.name as vendor_name,
    v.contact_name,
    v.contact_email,
    v.contact_phone,
    v.website,
    v.created_at,
    v.created_by,
    COALESCE(COUNT(lp.id), 0) as total_purchases,
    COALESCE(SUM(lp.total_cost), 0) as total_spent,
    COALESCE(COUNT(DISTINCT lp.user_id), 0) as unique_users
  FROM lead_vendors v
  LEFT JOIN lead_purchases lp ON lp.vendor_id = v.id
  WHERE v.imo_id = COALESCE(p_imo_id, get_my_imo_id())
  GROUP BY v.id, v.name, v.contact_name, v.contact_email,
           v.contact_phone, v.website, v.created_at, v.created_by
  ORDER BY v.name;
$$;

GRANT EXECUTE ON FUNCTION get_vendors_with_stats(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION get_vendors_with_stats(uuid, boolean) IS
'Returns all vendors with purchase statistics. Falls back to current user IMO when p_imo_id is NULL.';
