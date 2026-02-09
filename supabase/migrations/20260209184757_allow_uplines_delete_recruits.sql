-- supabase/migrations/20260209184757_allow_uplines_delete_recruits.sql
-- Allow uplines/recruiters to delete their own recruits
-- Replaces the overly restrictive 5-minute window policy

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Recruiters can delete own recent recruits" ON user_profiles;

-- New policy: Uplines can delete recruits they manage
CREATE POLICY "Uplines can delete own recruits"
  ON user_profiles
  FOR DELETE
  USING (
    auth.uid() = upline_id
    AND 'recruit' = ANY(roles)
  );

-- New policy: Recruiters can delete recruits they recruited
CREATE POLICY "Recruiters can delete own recruits"
  ON user_profiles
  FOR DELETE
  USING (
    auth.uid() = recruiter_id
    AND 'recruit' = ANY(roles)
  );
