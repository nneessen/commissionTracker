-- supabase/migrations/20251223_043_automation_logs_delete_policy.sql
-- Add DELETE policy for pipeline_automation_logs to allow unenrollment

-- Super admins can delete any automation logs
CREATE POLICY "automation_logs_super_admin_delete"
  ON pipeline_automation_logs
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- IMO admins can delete logs for recruits in their IMO
CREATE POLICY "automation_logs_imo_admin_delete"
  ON pipeline_automation_logs
  FOR DELETE
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = pipeline_automation_logs.recruit_id
      AND up.imo_id = get_my_imo_id()
    )
  );

-- Agency owners can delete logs for recruits in their downline
CREATE POLICY "automation_logs_agency_owner_delete"
  ON pipeline_automation_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND 'agency_owner' = ANY(up.roles)
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles recruit
      WHERE recruit.id = pipeline_automation_logs.recruit_id
      AND recruit.agency_id = get_my_agency_id()
    )
  );

COMMENT ON POLICY "automation_logs_super_admin_delete" ON pipeline_automation_logs IS 'Super admins can delete automation logs (for unenrollment)';
COMMENT ON POLICY "automation_logs_imo_admin_delete" ON pipeline_automation_logs IS 'IMO admins can delete logs for recruits in their IMO';
COMMENT ON POLICY "automation_logs_agency_owner_delete" ON pipeline_automation_logs IS 'Agency owners can delete logs for recruits in their agency';
