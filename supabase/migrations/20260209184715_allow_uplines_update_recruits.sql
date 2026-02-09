-- supabase/migrations/20260209184715_allow_uplines_update_recruits.sql
-- Allow uplines/recruiters to update their own recruits' profiles
-- This enables the BasicRecruitingView edit functionality

-- Policy: Uplines can update recruits they manage (where they are the upline)
CREATE POLICY "Uplines can update own recruits"
  ON user_profiles
  FOR UPDATE
  USING (
    auth.uid() = upline_id
    AND 'recruit' = ANY(roles)
  )
  WITH CHECK (
    auth.uid() = upline_id
    AND 'recruit' = ANY(roles)
  );

-- Policy: Recruiters can update recruits they recruited (where they are the recruiter)
CREATE POLICY "Recruiters can update own recruits"
  ON user_profiles
  FOR UPDATE
  USING (
    auth.uid() = recruiter_id
    AND 'recruit' = ANY(roles)
  )
  WITH CHECK (
    auth.uid() = recruiter_id
    AND 'recruit' = ANY(roles)
  );
