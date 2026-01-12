-- supabase/migrations/20251219_004_upline_view_downline_profiles.sql
-- Add RLS policy allowing uplines to view their downlines' user_profiles
--
-- PROBLEM: Uplines cannot see their downlines' profiles, which breaks:
-- - getAgentOverrides (is_upline_of needs to read downline's hierarchy_path)
-- - getTeamComparison (needs to read downline's hierarchy_depth)
-- - Any agent detail queries

-- =============================================================================
-- STEP 1: Create SECURITY DEFINER function to get current user's hierarchy_path
-- =============================================================================
-- This avoids RLS recursion when querying user_profiles inside a user_profiles policy

CREATE OR REPLACE FUNCTION get_current_user_hierarchy_path()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT hierarchy_path FROM user_profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION get_current_user_hierarchy_path() TO authenticated;

COMMENT ON FUNCTION get_current_user_hierarchy_path IS
  'SECURITY DEFINER function to safely get current user hierarchy_path without RLS recursion';

-- =============================================================================
-- STEP 2: Add RLS policy for uplines to view their downlines' profiles
-- =============================================================================
-- A user can view another user's profile if:
-- - The other user's hierarchy_path starts with the current user's hierarchy_path
-- - This means the other user is somewhere in the current user's downline tree

DROP POLICY IF EXISTS "Uplines can view downline profiles" ON user_profiles;

CREATE POLICY "Uplines can view downline profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  -- Downline's hierarchy_path starts with upline's path followed by a dot
  -- Example: upline path = 'abc', downline path = 'abc.def' or 'abc.def.ghi'
  hierarchy_path LIKE get_current_user_hierarchy_path() || '.%'
);

COMMENT ON POLICY "Uplines can view downline profiles" ON user_profiles IS
  'Allows uplines to view user_profiles of anyone in their downline tree for team management';

-- =============================================================================
-- STEP 3: Verify the policy was created
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND policyname = 'Uplines can view downline profiles';

  IF policy_count = 1 THEN
    RAISE NOTICE '✅ Upline-view-downline policy created successfully';
  ELSE
    RAISE WARNING '❌ Failed to create upline-view-downline policy';
  END IF;
END $$;
