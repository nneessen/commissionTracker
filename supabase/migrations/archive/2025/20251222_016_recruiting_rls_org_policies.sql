-- Phase 8: Recruiting Pipeline Org Awareness
-- Migration 2 of 3: Enable RLS with org-scoped policies

-- ============================================================================
-- 1. Enable RLS on recruit_phase_progress
-- ============================================================================

ALTER TABLE recruit_phase_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own phase progress" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Recruiters can view their recruits' phase progress" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Recruiters can update their recruits' phase progress" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON recruit_phase_progress;

-- ============================================================================
-- 2. Create new RLS policies for recruit_phase_progress
-- ============================================================================

-- Super admins: full access
CREATE POLICY "Super admins can manage all recruit_phase_progress"
  ON recruit_phase_progress
  TO authenticated
  USING (is_super_admin());

-- IMO admins: SELECT/UPDATE within their IMO
CREATE POLICY "IMO admins can view recruit_phase_progress in own IMO"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can update recruit_phase_progress in own IMO"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners: SELECT/UPDATE within their agency (with IMO boundary)
CREATE POLICY "Agency owners can view recruit_phase_progress in own agency"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can update recruit_phase_progress in own agency"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Recruiters: access to their direct recruits
CREATE POLICY "Recruiters can view their recruits' phase progress"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update their recruits' phase progress"
  ON recruit_phase_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_phase_progress.user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- Users: view own records
CREATE POLICY "Users can view their own phase progress"
  ON recruit_phase_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Users can insert their own records OR recruiters can insert for their recruits
CREATE POLICY "Authenticated users can insert phase progress"
  ON recruit_phase_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- DELETE: Super admins and IMO admins only
CREATE POLICY "IMO admins can delete recruit_phase_progress in own IMO"
  ON recruit_phase_progress FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- ============================================================================
-- 3. Enable RLS on recruit_checklist_progress
-- ============================================================================

ALTER TABLE recruit_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Users can update their own checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Recruiters can view their recruits' checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Recruiters can update their recruits' checklist progress" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON recruit_checklist_progress;

-- ============================================================================
-- 4. Create new RLS policies for recruit_checklist_progress
-- ============================================================================

-- Super admins: full access
CREATE POLICY "Super admins can manage all recruit_checklist_progress"
  ON recruit_checklist_progress
  TO authenticated
  USING (is_super_admin());

-- IMO admins: SELECT/UPDATE within their IMO
CREATE POLICY "IMO admins can view recruit_checklist_progress in own IMO"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "IMO admins can update recruit_checklist_progress in own IMO"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );

-- Agency owners: SELECT/UPDATE within their agency (with IMO boundary)
CREATE POLICY "Agency owners can view recruit_checklist_progress in own agency"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

CREATE POLICY "Agency owners can update recruit_checklist_progress in own agency"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    is_agency_owner_of(agency_id)
    AND imo_id = get_my_imo_id()
  );

-- Recruiters: access to their direct recruits
CREATE POLICY "Recruiters can view their recruits' checklist progress"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update their recruits' checklist progress"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_checklist_progress.user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- Users: view and update own records
CREATE POLICY "Users can view their own checklist progress"
  ON recruit_checklist_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own checklist progress"
  ON recruit_checklist_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Users can insert their own records OR recruiters can insert for their recruits
CREATE POLICY "Authenticated users can insert checklist progress"
  ON recruit_checklist_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = user_id
      AND user_profiles.recruiter_id = auth.uid()
    )
  );

-- DELETE: Super admins and IMO admins only
CREATE POLICY "IMO admins can delete recruit_checklist_progress in own IMO"
  ON recruit_checklist_progress FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND imo_id = get_my_imo_id()
  );
