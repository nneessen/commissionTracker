-- Migration: Staff Recruit Management Permissions
-- Date: 2026-01-03
-- Purpose: Allow trainers and contracting_managers to manage recruits in their IMO
--
-- This migration adds RLS policies for staff roles to:
-- 1. UPDATE user_profiles for recruits within their IMO
-- 2. UPDATE/INSERT recruit_phase_progress within their IMO
-- 3. UPDATE/INSERT recruit_checklist_progress within their IMO
--
-- Staff roles: trainer, contracting_manager

-- ============================================================================
-- HELPER FUNCTION: Check if user is a staff role
-- ============================================================================

CREATE OR REPLACE FUNCTION is_staff_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (
      'trainer' = ANY(roles)
      OR 'contracting_manager' = ANY(roles)
    )
  );
$$;

-- ============================================================================
-- USER_PROFILES: Staff can update recruits in their IMO
-- ============================================================================

-- Drop if exists to allow re-running
DROP POLICY IF EXISTS "Staff can update recruits in own IMO" ON user_profiles;

-- Staff (trainers/contracting managers) can update recruit profiles within their IMO
CREATE POLICY "Staff can update recruits in own IMO"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    -- User is a staff role
    is_staff_role()
    -- Target user is in the same IMO
    AND imo_id = get_my_imo_id()
    -- Target user is a recruit
    AND 'recruit' = ANY(roles)
  )
  WITH CHECK (
    -- Same conditions for the updated row
    is_staff_role()
    AND imo_id = get_my_imo_id()
    AND 'recruit' = ANY(roles)
  );

-- ============================================================================
-- RECRUIT_PHASE_PROGRESS: Staff can manage phase progress in their IMO
-- ============================================================================

-- Drop if exists to allow re-running
DROP POLICY IF EXISTS "Staff can update phase_progress in own IMO" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Staff can view phase_progress in own IMO" ON recruit_phase_progress;

-- Staff can view phase progress for recruits in their IMO
CREATE POLICY "Staff can view phase_progress in own IMO"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  );

-- Staff can update phase progress for recruits in their IMO
CREATE POLICY "Staff can update phase_progress in own IMO"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  )
  WITH CHECK (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  );

-- Note: INSERT policy for staff already exists in 20251229_001_fix_phase_progress_insert_policies.sql

-- ============================================================================
-- RECRUIT_CHECKLIST_PROGRESS: Staff can manage checklist progress in their IMO
-- ============================================================================

-- Drop if exists to allow re-running
DROP POLICY IF EXISTS "Staff can update checklist_progress in own IMO" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Staff can view checklist_progress in own IMO" ON recruit_checklist_progress;

-- Staff can view checklist progress for recruits in their IMO
CREATE POLICY "Staff can view checklist_progress in own IMO"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  );

-- Staff can update checklist progress for recruits in their IMO
CREATE POLICY "Staff can update checklist_progress in own IMO"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  )
  WITH CHECK (
    is_staff_role()
    AND imo_id = get_my_imo_id()
  );

-- Note: INSERT policy for staff already exists in 20251229_001_fix_phase_progress_insert_policies.sql

-- ============================================================================
-- VERIFICATION: Grant summary
-- ============================================================================

COMMENT ON FUNCTION is_staff_role() IS 'Returns true if current user has trainer or contracting_manager role';

-- Verification query (run manually to confirm policies):
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
-- WHERE tablename IN ('user_profiles', 'recruit_phase_progress', 'recruit_checklist_progress')
-- AND policyname LIKE '%Staff%';
