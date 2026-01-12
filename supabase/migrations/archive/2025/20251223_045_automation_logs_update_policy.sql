-- supabase/migrations/20251223_045_automation_logs_update_policy.sql
-- Add UPDATE policy for pipeline_automation_logs

-- Super admins can update any automation logs
CREATE POLICY "automation_logs_super_admin_update"
  ON pipeline_automation_logs
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- IMO admins can update logs for recruits in their IMO
CREATE POLICY "automation_logs_imo_admin_update"
  ON pipeline_automation_logs
  FOR UPDATE
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = pipeline_automation_logs.recruit_id
      AND up.imo_id = get_my_imo_id()
    )
  )
  WITH CHECK (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = pipeline_automation_logs.recruit_id
      AND up.imo_id = get_my_imo_id()
    )
  );

-- Agency owners can update logs for recruits in their agency
CREATE POLICY "automation_logs_agency_owner_update"
  ON pipeline_automation_logs
  FOR UPDATE
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
  )
  WITH CHECK (
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

-- Users can update logs they created (for automation execution flow)
CREATE POLICY "automation_logs_creator_update"
  ON pipeline_automation_logs
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update logs for automations they can access
    EXISTS (
      SELECT 1 FROM pipeline_automations pa
      WHERE pa.id = automation_id
      AND (
        is_super_admin()
        OR (is_imo_admin() AND pa.phase_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM pipeline_phases pp
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pp.id = pa.phase_id
          AND pt.imo_id = get_my_imo_id()
        ))
        OR (is_imo_admin() AND pa.checklist_item_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM phase_checklist_items pci
          JOIN pipeline_phases pp ON pci.phase_id = pp.id
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pci.id = pa.checklist_item_id
          AND pt.imo_id = get_my_imo_id()
        ))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipeline_automations pa
      WHERE pa.id = automation_id
      AND (
        is_super_admin()
        OR (is_imo_admin() AND pa.phase_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM pipeline_phases pp
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pp.id = pa.phase_id
          AND pt.imo_id = get_my_imo_id()
        ))
        OR (is_imo_admin() AND pa.checklist_item_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM phase_checklist_items pci
          JOIN pipeline_phases pp ON pci.phase_id = pp.id
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pci.id = pa.checklist_item_id
          AND pt.imo_id = get_my_imo_id()
        ))
      )
    )
  );

COMMENT ON POLICY "automation_logs_super_admin_update" ON pipeline_automation_logs IS 'Super admins can update automation logs';
COMMENT ON POLICY "automation_logs_imo_admin_update" ON pipeline_automation_logs IS 'IMO admins can update logs for recruits in their IMO';
COMMENT ON POLICY "automation_logs_agency_owner_update" ON pipeline_automation_logs IS 'Agency owners can update logs for recruits in their agency';
COMMENT ON POLICY "automation_logs_creator_update" ON pipeline_automation_logs IS 'Users can update logs for automations they can access';
