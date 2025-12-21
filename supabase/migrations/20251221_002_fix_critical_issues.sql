-- =============================================================================
-- Fix Critical Issues in Multi-IMO Architecture
-- =============================================================================
-- 1. Fix is_upline_of() to use array containment instead of LIKE
-- 2. Fix agency owner_id assignment that failed due to ambiguous reference
-- =============================================================================

-- =============================================================================
-- 1. FIX: is_upline_of() - Use array containment instead of LIKE pattern
-- =============================================================================
-- Previous implementation used LIKE '%uuid%' which is:
--   a) Not index-friendly (full table scan)
--   b) Potentially vulnerable to substring false positives
-- New implementation splits hierarchy_path by '.' and checks array containment

CREATE OR REPLACE FUNCTION is_upline_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE target.id = target_user_id
    -- CRITICAL: Must be in the same agency for hierarchy to apply
    AND target.agency_id IS NOT NULL
    AND target.agency_id = me.agency_id
    -- Check upline relationship via hierarchy_path using array containment
    -- hierarchy_path format: 'uuid1.uuid2.uuid3' (dot-separated)
    AND target.hierarchy_path IS NOT NULL
    AND auth.uid()::text = ANY(string_to_array(target.hierarchy_path, '.'))
    -- Don't count self as upline
    AND target.id != auth.uid()
  );
$$;

COMMENT ON FUNCTION is_upline_of IS 'SECURITY DEFINER function to check if current user is an upline of the target user. Uses array containment for safe hierarchy_path checking. Enforces same-agency requirement.';

-- =============================================================================
-- 2. FIX: Agency owner_id assignment (fix ambiguous column reference)
-- =============================================================================
-- The original migration had: SET owner_id = owner_id (ambiguous)
-- This fix uses properly qualified variable names

DO $$
DECLARE
  v_owner_id UUID;
  v_agency_owner_id UUID;
BEGIN
  -- Check if FFG agency already has an owner
  SELECT owner_id INTO v_agency_owner_id
  FROM agencies
  WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Only set owner if not already set
  IF v_agency_owner_id IS NULL THEN
    -- Find a suitable owner: root agent (no upline) who is admin
    SELECT id INTO v_owner_id
    FROM user_profiles
    WHERE upline_id IS NULL
    AND imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    AND (is_admin = true OR is_super_admin = true)
    ORDER BY created_at ASC
    LIMIT 1;

    -- If no admin found, find any root agent
    IF v_owner_id IS NULL THEN
      SELECT id INTO v_owner_id
      FROM user_profiles
      WHERE upline_id IS NULL
      AND imo_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- Set the agency owner
    IF v_owner_id IS NOT NULL THEN
      UPDATE agencies
      SET owner_id = v_owner_id
      WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      RAISE NOTICE 'Set FFG agency owner to %', v_owner_id;
    ELSE
      RAISE NOTICE 'No suitable agency owner found for FFG';
    END IF;
  ELSE
    RAISE NOTICE 'FFG agency already has owner: %', v_agency_owner_id;
  END IF;
END $$;

-- =============================================================================
-- 3. Add GIN index for hierarchy_path array operations (performance)
-- =============================================================================
-- This helps with the array containment check in is_upline_of()

-- First, create a helper function to convert hierarchy_path to array
CREATE OR REPLACE FUNCTION hierarchy_path_array(path text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(path, '.');
$$;

-- Create functional index on the array representation
DROP INDEX IF EXISTS idx_user_profiles_hierarchy_array;
CREATE INDEX idx_user_profiles_hierarchy_array
ON user_profiles
USING gin(hierarchy_path_array(hierarchy_path))
WHERE hierarchy_path IS NOT NULL;

-- =============================================================================
-- 4. FIX: Storage policy UUID cast - add safe validation
-- =============================================================================
-- Replace the unsafe direct cast with a safe pattern match

-- Helper function for safe UUID validation
CREATE OR REPLACE FUNCTION safe_uuid_from_text(input text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN input::uuid;
  END IF;
  RETURN NULL;
END;
$$;

-- Update IMO assets policies to use safe UUID casting
DROP POLICY IF EXISTS "IMO members can view imo assets" ON storage.objects;
CREATE POLICY "IMO members can view imo assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_imo_id()
);

DROP POLICY IF EXISTS "IMO admins can upload imo assets" ON storage.objects;
CREATE POLICY "IMO admins can upload imo assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imo-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_imo_id()
  AND is_imo_admin()
);

DROP POLICY IF EXISTS "IMO admins can update imo assets" ON storage.objects;
CREATE POLICY "IMO admins can update imo assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_imo_id()
  AND is_imo_admin()
);

DROP POLICY IF EXISTS "IMO admins can delete imo assets" ON storage.objects;
CREATE POLICY "IMO admins can delete imo assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'imo-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_imo_id()
  AND is_imo_admin()
);

-- Update Agency assets policies to use safe UUID casting
DROP POLICY IF EXISTS "Agency members can view agency assets" ON storage.objects;
CREATE POLICY "Agency members can view agency assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_agency_id()
);

DROP POLICY IF EXISTS "Agency owners can upload agency assets" ON storage.objects;
CREATE POLICY "Agency owners can upload agency assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_agency_id()
  AND (is_agency_owner() OR is_imo_admin())
);

DROP POLICY IF EXISTS "Agency owners can update agency assets" ON storage.objects;
CREATE POLICY "Agency owners can update agency assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_agency_id()
  AND (is_agency_owner() OR is_imo_admin())
);

DROP POLICY IF EXISTS "Agency owners can delete agency assets" ON storage.objects;
CREATE POLICY "Agency owners can delete agency assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agency-assets'
  AND safe_uuid_from_text((storage.foldername(name))[1]) = get_my_agency_id()
  AND (is_agency_owner() OR is_imo_admin())
);

-- =============================================================================
-- Summary
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Fixed: is_upline_of() now uses array containment';
  RAISE NOTICE 'Fixed: Agency owner_id assignment';
  RAISE NOTICE 'Added: GIN index for hierarchy_path array operations';
  RAISE NOTICE 'Fixed: Storage policies use safe UUID casting';
END $$;
