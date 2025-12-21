-- =============================================================================
-- Fix is_upline_of() function to properly handle NULL agency_id cases
-- =============================================================================
-- CRITICAL FIX: The previous implementation allowed hierarchy checks to fail
-- silently when both users had NULL agency_id. This migration ensures that:
-- 1. Both users must have a non-NULL agency_id for hierarchy to apply
-- 2. If either user has NULL agency_id, the function returns FALSE
-- =============================================================================

CREATE OR REPLACE FUNCTION is_upline_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if the current user's ID appears in the target user's hierarchy_path
  -- AND both users are in the same agency (hierarchy is per-agency)
  -- CRITICAL: Both users MUST have agency_id set for hierarchy to apply
  SELECT EXISTS (
    SELECT 1 FROM user_profiles target
    JOIN user_profiles me ON me.id = auth.uid()
    WHERE target.id = target_user_id
    -- CRITICAL: BOTH users must have agency_id set
    -- If either is NULL, hierarchy relationship does not apply
    AND me.agency_id IS NOT NULL
    AND target.agency_id IS NOT NULL
    -- Must be in the same agency for hierarchy to apply
    AND target.agency_id = me.agency_id
    -- Check upline relationship via hierarchy_path
    AND target.hierarchy_path IS NOT NULL
    AND target.hierarchy_path LIKE '%' || auth.uid()::text || '%'
    -- Don't count self as upline
    AND target.id != auth.uid()
  );
$$;

-- Re-grant permissions (safe to re-run)
GRANT EXECUTE ON FUNCTION is_upline_of(uuid) TO authenticated;

-- Update comment to document the NULL handling behavior
COMMENT ON FUNCTION is_upline_of IS 'SECURITY DEFINER function to check if current user is an upline of the target user. CRITICAL: Both users must have agency_id set - hierarchy is per-agency. Returns FALSE if either user has NULL agency_id.';

-- =============================================================================
-- Also add WITH CHECK clause to agency management policies (HIGH-1 fix)
-- =============================================================================
DROP POLICY IF EXISTS "IMO admins can manage agencies in own IMO" ON agencies;
CREATE POLICY "IMO admins can manage agencies in own IMO"
ON agencies FOR ALL
TO authenticated
USING (imo_id = get_my_imo_id() AND is_imo_admin())
WITH CHECK (imo_id = get_my_imo_id() AND is_imo_admin());

-- =============================================================================
-- Verify fix
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'is_upline_of() function updated to require non-NULL agency_id for both users';
  RAISE NOTICE 'Agency management policy updated with WITH CHECK clause';
END $$;
