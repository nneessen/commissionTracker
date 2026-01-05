-- supabase/migrations/20260105_007_fix_rls_for_trigger.sql
-- Fix: Allow trigger to bypass RLS for user creation

-- The handle_new_user trigger runs when auth.users is inserted.
-- At that moment, auth.uid() is NOT the new user's ID.
-- The trigger uses SECURITY DEFINER and SET LOCAL row_security = off,
-- but we need to also grant proper permissions.

-- Option 1: Drop the restrictive insert policy
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;

-- Option 2: Create a more permissive policy for the trigger context
-- The trigger runs as postgres (function owner), so we can check for that
CREATE POLICY "allow_trigger_insert" ON user_profiles
FOR INSERT
WITH CHECK (
  -- Allow if no auth context (trigger/service context) OR user is inserting own profile
  auth.uid() IS NULL OR auth.uid() = id
);

COMMENT ON POLICY "allow_trigger_insert" ON user_profiles IS
'Allows system triggers to insert profiles when auth.uid() is not set';
