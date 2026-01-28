-- supabase/migrations/20260128102349_allow_admin_update_users.sql
-- Fix: Allow admins (is_admin=true) to update user profiles
-- Currently only super_admins can update other users, but regular admins need this too

-- ============================================================================
-- Helper function to check if current user is admin (not super admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

COMMENT ON FUNCTION is_admin IS 'Returns true if the current user is an admin.';

-- ============================================================================
-- Add admin policy to update user_profiles
-- ============================================================================
DROP POLICY IF EXISTS "Admins can update all users" ON user_profiles;
CREATE POLICY "Admins can update all users"
ON user_profiles FOR UPDATE
TO authenticated
USING (is_admin());

-- ============================================================================
-- Add admin policy to view user_profiles (for editing)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all users" ON user_profiles;
CREATE POLICY "Admins can view all users"
ON user_profiles FOR SELECT
TO authenticated
USING (is_admin());

-- Summary
DO $$
BEGIN
  RAISE NOTICE 'Admin update policies added for user_profiles';
END $$;
