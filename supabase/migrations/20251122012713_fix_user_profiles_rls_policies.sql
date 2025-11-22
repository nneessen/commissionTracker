-- Fix user_profiles RLS policies to prevent 403 errors
-- The issue: existing policies are too restrictive or have circular dependencies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Create new, simpler policies
-- Policy 1: Allow users to read their own profile (no complex checks)
CREATE POLICY "Enable read access for users to own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Allow admins to read all profiles
CREATE POLICY "Enable read access for admins to all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'nick@nickneessen.com'
    )
  );

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Enable update access for users to own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 4: Allow admins to update any profile
CREATE POLICY "Enable update access for admins to all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'nick@nickneessen.com'
    )
  );

-- Policy 5: Allow admins to delete profiles
CREATE POLICY "Enable delete access for admins"
  ON user_profiles
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'nick@nickneessen.com'
    )
  );

-- Policy 6: Allow INSERT during signup (via trigger)
-- This allows the trigger to insert profiles for new users
CREATE POLICY "Enable insert for authenticated users during signup"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Verify RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add comment explaining the fix
COMMENT ON TABLE user_profiles IS 'User approval profiles with RLS policies that prevent 403 errors. Updated 2025-11-22.';
