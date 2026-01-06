-- supabase/migrations/20260106_001_lead_vendor_imo_aggregate.sql
-- IMO-aggregate vendor performance stats and vendor management functions

-- ============================================================================
-- 1. Helper function: Get lead stats by vendor - IMO aggregate
-- Returns combined stats from ALL users in the IMO, not just one user
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
BEGIN
  -- Default to current user's IMO if not provided
  v_imo_id := COALESCE(p_imo_id, (SELECT imo_id FROM user_profiles WHERE id = auth.uid()));

  RETURN QUERY
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
  WHERE lv.imo_id = v_imo_id
    AND lv.is_active = true
  GROUP BY lv.id, lv.name
  ORDER BY total_spent DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_stats_by_vendor_imo_aggregate(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_lead_stats_by_vendor_imo_aggregate(uuid, date, date) IS
'Returns lead purchase statistics grouped by vendor, aggregated across ALL users in the IMO';

-- ============================================================================
-- 2. Helper function: Get vendors with purchase stats for management
-- Returns all vendors (including inactive) with aggregate purchase data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vendors_with_stats(
  p_imo_id uuid DEFAULT NULL,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name varchar,
  contact_name varchar,
  contact_email varchar,
  contact_phone varchar,
  website varchar,
  is_active boolean,
  created_at timestamptz,
  created_by uuid,
  total_purchases bigint,
  total_spent numeric,
  unique_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
BEGIN
  -- Default to current user's IMO if not provided
  v_imo_id := COALESCE(p_imo_id, (SELECT imo_id FROM user_profiles WHERE id = auth.uid()));

  RETURN QUERY
  SELECT
    lv.id as vendor_id,
    lv.name as vendor_name,
    lv.contact_name,
    lv.contact_email,
    lv.contact_phone,
    lv.website,
    lv.is_active,
    lv.created_at,
    lv.created_by,
    COUNT(lp.id)::bigint as total_purchases,
    COALESCE(SUM(lp.total_cost), 0) as total_spent,
    COUNT(DISTINCT lp.user_id)::bigint as unique_users
  FROM lead_vendors lv
  LEFT JOIN lead_purchases lp ON lp.vendor_id = lv.id
  WHERE lv.imo_id = v_imo_id
    AND (p_include_inactive = true OR lv.is_active = true)
  GROUP BY lv.id, lv.name, lv.contact_name, lv.contact_email, lv.contact_phone,
           lv.website, lv.is_active, lv.created_at, lv.created_by
  ORDER BY lv.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_vendors_with_stats(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION get_vendors_with_stats(uuid, boolean) IS
'Returns all vendors with aggregate purchase statistics for management UI';

-- ============================================================================
-- 3. Helper function: Merge vendors (reassign purchases)
-- Only super admins or IMO admins should call this
-- ============================================================================

CREATE OR REPLACE FUNCTION merge_vendors(
  p_keep_vendor_id uuid,
  p_merge_vendor_ids uuid[]
)
RETURNS TABLE (
  reassigned_count bigint,
  merged_vendor_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reassigned bigint := 0;
  v_merged_count integer := 0;
  v_vendor_id uuid;
  v_user_imo_id uuid;
  v_keep_vendor_imo_id uuid;
BEGIN
  -- Check user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's IMO
  SELECT imo_id INTO v_user_imo_id FROM user_profiles WHERE id = auth.uid();

  -- Get keep vendor's IMO
  SELECT imo_id INTO v_keep_vendor_imo_id FROM lead_vendors WHERE id = p_keep_vendor_id;

  -- Verify keep vendor belongs to user's IMO (unless super admin)
  IF NOT (
    (SELECT is_super_admin FROM user_profiles WHERE id = auth.uid()) = true
    OR v_keep_vendor_imo_id = v_user_imo_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: vendor does not belong to your IMO';
  END IF;

  -- Reassign all purchases from merge vendors to keep vendor
  UPDATE lead_purchases
  SET vendor_id = p_keep_vendor_id, updated_at = now()
  WHERE vendor_id = ANY(p_merge_vendor_ids);

  GET DIAGNOSTICS v_reassigned = ROW_COUNT;

  -- Soft-delete merged vendors
  FOREACH v_vendor_id IN ARRAY p_merge_vendor_ids LOOP
    UPDATE lead_vendors
    SET is_active = false, updated_at = now()
    WHERE id = v_vendor_id;

    v_merged_count := v_merged_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_reassigned, v_merged_count;
END;
$$;

GRANT EXECUTE ON FUNCTION merge_vendors(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION merge_vendors(uuid, uuid[]) IS
'Merges multiple vendors into one by reassigning all purchases and soft-deleting merged vendors';
