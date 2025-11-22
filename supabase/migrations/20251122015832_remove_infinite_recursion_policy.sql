-- Remove the admin policy that causes infinite recursion
-- The policy was trying to query user_profiles to check if user is admin,
-- which creates a circular dependency (reading user_profiles requires checking the policy,
-- which requires reading user_profiles, etc.)

-- Drop the broken admin policy
DROP POLICY IF EXISTS "user_profiles_admin_all" ON user_profiles;

-- The remaining policies are sufficient:
-- 1. "user_profiles_select_own" - Users (including admin) can read their own profile
-- 2. "user_profiles_update_own" - Users (including admin) can update their own profile
-- 3. "user_profiles_insert_own" - Users can insert their own profile during signup

-- If admin needs to manage other users' profiles, we'll create a separate
-- security definer function that bypasses RLS for that specific operation.
