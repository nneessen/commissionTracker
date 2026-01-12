-- supabase/migrations/20251229_001_fix_phase_progress_insert_policies.sql
-- Fix RLS INSERT policies for recruit_phase_progress and recruit_checklist_progress
--
-- Issue: IMO admins, agency owners, and staff (trainers/contracting managers) can view
-- and update progress records but cannot INSERT new records. This causes 403 errors
-- when syncPhaseProgressWithTemplate tries to create initial phase progress records.

-- ============================================================================
-- 1. ADD INSERT POLICIES FOR recruit_phase_progress
-- ============================================================================

-- IMO admins can insert phase progress records within their IMO
DROP POLICY IF EXISTS "IMO admins can insert recruit_phase_progress in own IMO" ON recruit_phase_progress;
CREATE POLICY "IMO admins can insert recruit_phase_progress in own IMO"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners can insert phase progress records within their agency
DROP POLICY IF EXISTS "Agency owners can insert phase_progress in own agency" ON recruit_phase_progress;
CREATE POLICY "Agency owners can insert phase_progress in own agency"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Staff (trainers/contracting managers) can insert phase progress records within their IMO
DROP POLICY IF EXISTS "Staff can insert phase_progress in own IMO" ON recruit_phase_progress;
CREATE POLICY "Staff can insert phase_progress in own IMO"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_phase_progress.imo_id
    )
  );

-- ============================================================================
-- 2. ADD INSERT POLICIES FOR recruit_checklist_progress
-- ============================================================================

-- IMO admins can insert checklist progress records within their IMO
DROP POLICY IF EXISTS "IMO admins can insert checklist_progress in own IMO" ON recruit_checklist_progress;
CREATE POLICY "IMO admins can insert checklist_progress in own IMO"
  ON recruit_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners can insert checklist progress records within their agency
DROP POLICY IF EXISTS "Agency owners can insert checklist_progress in own agency" ON recruit_checklist_progress;
CREATE POLICY "Agency owners can insert checklist_progress in own agency"
  ON recruit_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Staff (trainers/contracting managers) can insert checklist progress records within their IMO
DROP POLICY IF EXISTS "Staff can insert checklist_progress in own IMO" ON recruit_checklist_progress;
CREATE POLICY "Staff can insert checklist_progress in own IMO"
  ON recruit_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_checklist_progress.imo_id
    )
  );

-- ============================================================================
-- 3. ADD VIEW/UPDATE POLICIES FOR STAFF ROLES
-- ============================================================================

-- Staff need to view phase progress to display pipelines
DROP POLICY IF EXISTS "Staff can view phase_progress in own IMO" ON recruit_phase_progress;
CREATE POLICY "Staff can view phase_progress in own IMO"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_phase_progress.imo_id
    )
  );

-- Staff can update phase progress
DROP POLICY IF EXISTS "Staff can update phase_progress in own IMO" ON recruit_phase_progress;
CREATE POLICY "Staff can update phase_progress in own IMO"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_phase_progress.imo_id
    )
  );

-- Staff can view checklist progress
DROP POLICY IF EXISTS "Staff can view checklist_progress in own IMO" ON recruit_checklist_progress;
CREATE POLICY "Staff can view checklist_progress in own IMO"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_checklist_progress.imo_id
    )
  );

-- Staff can update checklist progress
DROP POLICY IF EXISTS "Staff can update checklist_progress in own IMO" ON recruit_checklist_progress;
CREATE POLICY "Staff can update checklist_progress in own IMO"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.roles && ARRAY['trainer', 'contracting_manager', 'staff']::text[]
      AND user_profiles.imo_id = recruit_checklist_progress.imo_id
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "IMO admins can insert recruit_phase_progress in own IMO" ON recruit_phase_progress
  IS 'IMO admins can create phase progress records for recruits within their IMO';
COMMENT ON POLICY "Agency owners can insert phase_progress in own agency" ON recruit_phase_progress
  IS 'Agency owners can create phase progress records for recruits within their agency';
COMMENT ON POLICY "Staff can insert phase_progress in own IMO" ON recruit_phase_progress
  IS 'Trainers and contracting managers can create phase progress records within their IMO';
