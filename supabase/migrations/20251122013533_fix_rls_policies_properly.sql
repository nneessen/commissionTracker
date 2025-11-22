-- Fix RLS policies - the problem is policies trying to query auth.users table
-- which users don't have permission to access

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for admins to all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for admins to all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete access for admins" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON user_profiles;

-- Create new simple policies that DON'T query auth.users
-- Policy 1: Users can read their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile  
CREATE POLICY "user_profiles_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy 3: Allow INSERT during signup (for the trigger)
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can do everything (using is_admin column, not querying auth.users)
CREATE POLICY "user_profiles_admin_all"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
