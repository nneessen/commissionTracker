-- Fix user_profiles RLS infinite recursion
-- Drop the problematic policies that cause recursion

BEGIN;

-- Drop policies that cause infinite recursion by querying user_profiles within the policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users cannot update profiles" ON user_profiles;

-- Keep only the simple policy that allows users to view their own profile
-- "Users can view own profile" already exists and uses: auth.uid() = id (no recursion)

-- Add a new policy for admins to update ANY profile (including approvals)
-- This uses a simple check without recursion
CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE
  USING (
    -- Admin email hardcoded to avoid recursion
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

-- Add policy for admins to view all profiles
-- Uses hardcoded admin email to avoid recursion
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

COMMIT;

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed user_profiles RLS policies';
    RAISE NOTICE '   - Removed recursive policies';
    RAISE NOTICE '   - Added admin policies that check auth.users.email directly';
    RAISE NOTICE '   - Users can now view their own profiles without recursion';
END $$;
