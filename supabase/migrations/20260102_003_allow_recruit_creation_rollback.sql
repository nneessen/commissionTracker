-- supabase/migrations/20260102_003_allow_recruit_creation_rollback.sql
-- Allow recruiters to delete recruits they just created (for rollback on invitation failure)

-- Drop old policy if exists
DROP POLICY IF EXISTS "Recruiters can delete own recent recruits" ON user_profiles;

-- Allow recruiters to delete recruits they created within last 5 minutes
-- This enables proper rollback when invitation creation fails
CREATE POLICY "Recruiters can delete own recent recruits"
  ON user_profiles FOR DELETE
  USING (
    recruiter_id = auth.uid()
    AND created_at > NOW() - INTERVAL '5 minutes'
    AND 'recruit' = ANY(roles)
    AND approval_status = 'pending'
  );

COMMENT ON POLICY "Recruiters can delete own recent recruits" ON user_profiles IS
  'Allows recruiters to delete recruits they just created within 5 minutes. This enables proper rollback when invitation creation fails.';
