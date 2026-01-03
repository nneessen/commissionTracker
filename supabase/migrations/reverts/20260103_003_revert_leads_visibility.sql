-- Revert: Fix Leads Visibility for Staff Roles
-- Date: 2026-01-03
-- Reverts: 20260103_003_fix_leads_visibility.sql
--
-- This restores the IMO-wide visibility for staff roles

-- Restore staff SELECT policy
CREATE POLICY "Staff can view IMO leads"
  ON recruiting_leads
  FOR SELECT
  TO authenticated
  USING (
    imo_id = get_my_imo_id() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    )
  );

-- Restore staff UPDATE policy
CREATE POLICY "Staff can update IMO leads"
  ON recruiting_leads
  FOR UPDATE
  TO authenticated
  USING (
    imo_id = get_my_imo_id() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (
        'trainer' = ANY(roles) OR
        'contracting_manager' = ANY(roles) OR
        'imo_owner' = ANY(roles) OR
        'admin' = ANY(roles)
      )
    )
  );

COMMENT ON TABLE recruiting_leads IS 'Stores public recruiting funnel submissions before they become recruits';
