-- supabase/migrations/20260121134419_vendor_hard_delete.sql
-- Migration: Replace vendor soft-delete with hard delete
-- Keep ON DELETE RESTRICT (already set) - deletion blocked if purchases exist
-- This is the desired behavior: vendors with purchases cannot be deleted directly

-- Remove is_active column (no longer needed - no soft-delete)
ALTER TABLE lead_vendors DROP COLUMN IF EXISTS is_active;

-- Drop existing functions first (required when changing return types)
DROP FUNCTION IF EXISTS merge_vendors(uuid, uuid[]);
DROP FUNCTION IF EXISTS get_vendors_with_stats(uuid, boolean);

-- Update merge_vendors function to hard-delete merged vendors after reassignment
CREATE OR REPLACE FUNCTION merge_vendors(
  p_keep_vendor_id uuid,
  p_merge_vendor_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_imo_id uuid;
  v_keep_imo_id uuid;
  v_reassigned_count integer;
  v_deleted_count integer;
BEGIN
  -- Get current user's IMO
  SELECT imo_id INTO v_user_imo_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Verify keep vendor belongs to user's IMO
  SELECT imo_id INTO v_keep_imo_id
  FROM lead_vendors
  WHERE id = p_keep_vendor_id;

  IF v_keep_imo_id IS NULL OR v_keep_imo_id != v_user_imo_id THEN
    RAISE EXCEPTION 'Keep vendor not found or not in your IMO';
  END IF;

  -- Reassign purchases from merge vendors to keep vendor
  UPDATE lead_purchases
  SET vendor_id = p_keep_vendor_id,
      updated_at = now()
  WHERE vendor_id = ANY(p_merge_vendor_ids);

  GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;

  -- Hard delete merged vendors (purchases already reassigned, so RESTRICT won't block)
  DELETE FROM lead_vendors
  WHERE id = ANY(p_merge_vendor_ids)
    AND imo_id = v_user_imo_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'reassigned_count', v_reassigned_count,
    'deleted_count', v_deleted_count
  );
END;
$$;

-- Update get_vendors_with_stats to remove is_active references
CREATE OR REPLACE FUNCTION get_vendors_with_stats(
  p_imo_id uuid,
  p_include_inactive boolean DEFAULT false  -- Parameter kept for backwards compatibility, ignored
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
  WHERE v.imo_id = p_imo_id
  GROUP BY v.id, v.name, v.contact_name, v.contact_email,
           v.contact_phone, v.website, v.created_at, v.created_by
  ORDER BY v.name;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION merge_vendors(uuid, uuid[]) IS 'Merges multiple vendors into one by reassigning purchases and hard-deleting merged vendors';
COMMENT ON FUNCTION get_vendors_with_stats(uuid, boolean) IS 'Returns all vendors with purchase statistics. The p_include_inactive parameter is deprecated and ignored.';
