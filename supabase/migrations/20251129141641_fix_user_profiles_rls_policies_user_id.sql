-- Fix RLS policies on user_profiles to use user_id instead of id
-- The id column is the profile's primary key (auto-generated UUID)
-- The user_id column references auth.users(id) which is what auth.uid() returns

-- Drop the broken policies
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;

-- Recreate policies with correct user_id reference
-- Users can SELECT their own profile by matching auth.uid() to user_id
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can UPDATE their own profile by matching auth.uid() to user_id
CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can INSERT their own profile (user_id must match auth.uid())
-- This allows a user to create their own profile entry
CREATE POLICY "user_profiles_insert_own" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
