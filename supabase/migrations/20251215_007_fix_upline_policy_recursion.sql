-- Migration: Fix infinite recursion in user_profiles RLS policies
-- The previous migration (006) caused infinite recursion by querying user_profiles inside a user_profiles policy

-- Step 1: Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "user_profiles_select_own_upline" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own_recruiter" ON user_profiles;

-- Step 2: Create a SECURITY DEFINER function that bypasses RLS to get upline/recruiter IDs
-- This function runs with elevated privileges and doesn't trigger RLS policies
CREATE OR REPLACE FUNCTION get_user_upline_and_recruiter_ids(user_id uuid)
RETURNS TABLE(upline_id uuid, recruiter_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT up.upline_id, up.recruiter_id
  FROM user_profiles up
  WHERE up.id = user_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_upline_and_recruiter_ids(uuid) TO authenticated;

-- Step 3: Create new non-recursive policies using the SECURITY DEFINER function
-- Allow users to view their upline's profile
CREATE POLICY "user_profiles_select_own_upline"
ON user_profiles FOR SELECT
USING (
  id = (SELECT upline_id FROM get_user_upline_and_recruiter_ids(auth.uid()))
);

-- Allow users to view their recruiter's profile
CREATE POLICY "user_profiles_select_own_recruiter"
ON user_profiles FOR SELECT
USING (
  id = (SELECT recruiter_id FROM get_user_upline_and_recruiter_ids(auth.uid()))
);

COMMENT ON FUNCTION get_user_upline_and_recruiter_ids IS 'SECURITY DEFINER function to safely get upline/recruiter IDs without triggering RLS recursion';
COMMENT ON POLICY "user_profiles_select_own_upline" ON user_profiles IS 'Allows users to view their upline profile for communication';
COMMENT ON POLICY "user_profiles_select_own_recruiter" ON user_profiles IS 'Allows users to view their recruiter profile for communication';
