-- Migration: Allow users to view their own upline/recruiter profile
-- Issue: Recruits cannot see their upline's profile to send them emails

-- Allow users to view the profile of their upline
CREATE POLICY "user_profiles_select_own_upline"
ON user_profiles FOR SELECT
USING (
  -- User can view profiles that are their upline
  id IN (
    SELECT upline_id FROM user_profiles WHERE user_profiles.id = auth.uid()
  )
);

-- Allow users to view the profile of their recruiter
CREATE POLICY "user_profiles_select_own_recruiter"
ON user_profiles FOR SELECT
USING (
  -- User can view profiles that are their recruiter
  id IN (
    SELECT recruiter_id FROM user_profiles WHERE user_profiles.id = auth.uid()
  )
);

COMMENT ON POLICY "user_profiles_select_own_upline" ON user_profiles IS 'Allows users to view their upline profile for communication';
COMMENT ON POLICY "user_profiles_select_own_recruiter" ON user_profiles IS 'Allows users to view their recruiter profile for communication';
