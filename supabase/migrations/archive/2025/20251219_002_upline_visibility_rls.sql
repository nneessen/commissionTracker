-- supabase/migrations/20251219_002_upline_visibility_rls.sql
-- Add RLS policies to allow uplines to view their downlines' policies, commissions, and override_commissions
--
-- ROOT CAUSE: Uplines cannot see their downlines' data because RLS only allows users to view their own records
-- SOLUTION: Add SELECT policies that check if current user is in the hierarchy chain of the record owner

-- =============================================================================
-- STEP 1: Create SECURITY DEFINER function to check upline relationship
-- =============================================================================
-- This function bypasses RLS to safely check if current_user_id is an upline of target_user_id
-- Uses hierarchy_path which contains the full upline chain (e.g., 'abc.def.ghi' where abc→def→ghi)

CREATE OR REPLACE FUNCTION is_upline_of(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if the current user's ID appears in the target user's hierarchy_path
  -- hierarchy_path format: 'upline1_id.upline2_id.current_id' (ancestor → descendant)
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = target_user_id
    AND hierarchy_path IS NOT NULL
    AND hierarchy_path LIKE '%' || auth.uid()::text || '%'
    AND id != auth.uid()  -- Don't count self as upline
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_upline_of(uuid) TO authenticated;

COMMENT ON FUNCTION is_upline_of IS 'SECURITY DEFINER function to check if current user is an upline of the target user. Uses hierarchy_path for fast lookup.';

-- =============================================================================
-- STEP 2: Add RLS policy for policies table - uplines can view downline policies
-- =============================================================================

-- First, drop any existing upline policy to avoid conflicts
DROP POLICY IF EXISTS "Uplines can view downline policies" ON policies;

-- Create policy for uplines to view their downlines' policies
CREATE POLICY "Uplines can view downline policies"
ON policies FOR SELECT
TO authenticated
USING (
  is_upline_of(user_id)
);

COMMENT ON POLICY "Uplines can view downline policies" ON policies IS 'Allows uplines to view policies created by their downlines for team management';

-- =============================================================================
-- STEP 3: Add RLS policy for commissions table - uplines can view downline commissions
-- =============================================================================

-- First, drop any existing upline policy to avoid conflicts
DROP POLICY IF EXISTS "Uplines can view downline commissions" ON commissions;

-- Create policy for uplines to view their downlines' commissions
CREATE POLICY "Uplines can view downline commissions"
ON commissions FOR SELECT
TO authenticated
USING (
  is_upline_of(user_id)
);

COMMENT ON POLICY "Uplines can view downline commissions" ON commissions IS 'Allows uplines to view commissions earned by their downlines for team tracking';

-- =============================================================================
-- STEP 4: Add RLS policy for override_commissions table - uplines can view downline overrides
-- =============================================================================

-- First, drop any existing upline policy to avoid conflicts
DROP POLICY IF EXISTS "Uplines can view downline override_commissions" ON override_commissions;

-- Create policy for uplines to view their downlines' override commissions
-- Note: override_commissions.agent_id is the upline who receives the override
-- Note: override_commissions.source_agent_id is the downline whose production generated the override
CREATE POLICY "Uplines can view downline override_commissions"
ON override_commissions FOR SELECT
TO authenticated
USING (
  -- User can view if they are the agent receiving the override
  agent_id = auth.uid()
  OR
  -- Or if they are an upline of the source agent
  is_upline_of(source_agent_id)
);

COMMENT ON POLICY "Uplines can view downline override_commissions" ON override_commissions IS 'Allows viewing overrides: own overrides OR overrides from downline production';

-- =============================================================================
-- STEP 5: Verify policies are created
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname LIKE '%Uplines can view%';

  RAISE NOTICE 'Created % upline visibility policies', policy_count;

  IF policy_count < 3 THEN
    RAISE WARNING 'Expected 3 upline policies, but found %', policy_count;
  END IF;
END $$;
