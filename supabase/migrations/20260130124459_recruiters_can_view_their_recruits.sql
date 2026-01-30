-- supabase/migrations/20260130124459_recruiters_can_view_their_recruits.sql
-- Fix: Allow recruiters to view their own recruits in user_profiles
-- This addresses the RLS gap where recruiters could not SELECT their recruits
-- even though recruiter_id was properly set.

-- ============================================================================
-- ROOT CAUSE ANALYSIS
-- ============================================================================
-- Previously, user_profiles had SELECT policies for:
--   - Super admins (can view all)
--   - Admins (can view all)
--   - IMO admins (can view users in their IMO)
--   - Uplines (can view downlines via hierarchy_path)
--
-- BUT there was NO policy for: recruiter_id = auth.uid()
--
-- This caused recruits to not appear in the recruiter's pipeline view,
-- even though they were correctly linked via recruiter_id.
-- The admin view worked because admins have a blanket SELECT policy.
-- ============================================================================

-- Add SELECT policy for recruiters to view their recruits
CREATE POLICY "Recruiters can view their recruits"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    recruiter_id = auth.uid()
  );

COMMENT ON POLICY "Recruiters can view their recruits" ON user_profiles IS
  'Allows authenticated users to view user_profiles records where they are listed as the recruiter_id. This enables recruiters to see recruits they have added to the system.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the policy was created:
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'user_profiles'
-- AND policyname = 'Recruiters can view their recruits';
--
-- Expected result: One row with cmd='SELECT' and qual containing 'recruiter_id'
-- ============================================================================
