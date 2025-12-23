-- supabase/migrations/20251223_046_fix_recruiting_progress_policies.sql
-- Fix RLS policies for recruit_phase_progress and recruit_checklist_progress
-- Issues:
-- 1. Super admin policy missing WITH CHECK (blocks INSERT)
-- 2. No upline support (upline should be able to manage downline progress)

-- ============================================================================
-- FIX recruit_phase_progress POLICIES
-- ============================================================================

-- Drop and recreate super admin policy with WITH CHECK
DROP POLICY IF EXISTS "Super admins can manage all recruit_phase_progress" ON recruit_phase_progress;
CREATE POLICY "Super admins can manage all recruit_phase_progress"
  ON recruit_phase_progress
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add upline support for INSERT
DROP POLICY IF EXISTS "Authenticated users can insert phase progress" ON recruit_phase_progress;
CREATE POLICY "Authenticated users can insert phase progress"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for SELECT
DROP POLICY IF EXISTS "Recruiters can view their recruits' phase progress" ON recruit_phase_progress;
CREATE POLICY "Uplines can view their recruits' phase progress"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for UPDATE
DROP POLICY IF EXISTS "Recruiters can update their recruits' phase progress" ON recruit_phase_progress;
CREATE POLICY "Uplines can update their recruits' phase progress"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for DELETE
CREATE POLICY "Uplines can delete their recruits' phase progress"
  ON recruit_phase_progress FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- FIX recruit_checklist_progress POLICIES
-- ============================================================================

-- Drop and recreate super admin policy with WITH CHECK
DROP POLICY IF EXISTS "Super admins can manage all recruit_checklist_progress" ON recruit_checklist_progress;
CREATE POLICY "Super admins can manage all recruit_checklist_progress"
  ON recruit_checklist_progress
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add upline support for INSERT
DROP POLICY IF EXISTS "Authenticated users can insert checklist progress" ON recruit_checklist_progress;
CREATE POLICY "Authenticated users can insert checklist progress"
  ON recruit_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for SELECT
DROP POLICY IF EXISTS "Recruiters can view their recruits' checklist progress" ON recruit_checklist_progress;
CREATE POLICY "Uplines can view their recruits' checklist progress"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for UPDATE
DROP POLICY IF EXISTS "Recruiters can update their recruits' checklist progress" ON recruit_checklist_progress;
CREATE POLICY "Uplines can update their recruits' checklist progress"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- Add upline support for DELETE
CREATE POLICY "Uplines can delete their recruits' checklist progress"
  ON recruit_checklist_progress FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND (
        user_profiles.recruiter_id = auth.uid()
        OR user_profiles.upline_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Super admins can manage all recruit_phase_progress" ON recruit_phase_progress
  IS 'Super admins have full access to all phase progress records';
COMMENT ON POLICY "Super admins can manage all recruit_checklist_progress" ON recruit_checklist_progress
  IS 'Super admins have full access to all checklist progress records';
