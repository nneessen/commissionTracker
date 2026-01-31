-- supabase/migrations/20260131113838_agent_view_team_contacts.sql
-- Fix: Allow authenticated users to view approved team members for messaging
--
-- PROBLEM: Regular agents with no downlines see 0 contacts in email compose
-- because RLS policies only allow viewing:
-- 1. Own profile (excluded by contact query)
-- 2. Downlines (agent has none)
-- 3. All users (admin only)
--
-- SOLUTION: Add permissive SELECT policy for approved team members

-- =============================================================================
-- Drop existing policy if it exists (idempotent)
-- =============================================================================
DROP POLICY IF EXISTS "Agents can view approved team members" ON user_profiles;

-- =============================================================================
-- Create new policy allowing all authenticated users to view approved members
-- =============================================================================
-- User decision: All agencies visible (no agency isolation required)
-- This is a SELECT-only policy; UPDATE policies remain unchanged

CREATE POLICY "Agents can view approved team members"
ON user_profiles FOR SELECT
TO authenticated
USING (
  -- Only allow viewing approved users with email addresses
  -- This is for contact browsing/messaging purposes
  approval_status = 'approved'
  AND email IS NOT NULL
);

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND policyname = 'Agents can view approved team members';

  IF policy_count = 1 THEN
    RAISE NOTICE 'RLS policy "Agents can view approved team members" created successfully';
  ELSE
    RAISE WARNING 'Failed to create RLS policy';
  END IF;
END $$;
