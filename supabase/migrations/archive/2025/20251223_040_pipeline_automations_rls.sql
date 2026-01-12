-- supabase/migrations/20251223_040_pipeline_automations_rls.sql
-- RLS policies for pipeline automation tables

-- Enable RLS
ALTER TABLE pipeline_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_automation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PIPELINE_AUTOMATIONS POLICIES
-- ============================================

-- Super admins: full access to all automations
CREATE POLICY "pipeline_automations_super_admin"
  ON pipeline_automations
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- IMO admins: access to automations for phases in their IMO's templates
CREATE POLICY "pipeline_automations_imo_admin_phase"
  ON pipeline_automations
  FOR ALL
  TO authenticated
  USING (
    is_imo_admin()
    AND phase_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pipeline_phases pp
      JOIN pipeline_templates pt ON pp.template_id = pt.id
      WHERE pp.id = pipeline_automations.phase_id
      AND pt.imo_id = get_my_imo_id()
    )
  )
  WITH CHECK (
    is_imo_admin()
    AND phase_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pipeline_phases pp
      JOIN pipeline_templates pt ON pp.template_id = pt.id
      WHERE pp.id = pipeline_automations.phase_id
      AND pt.imo_id = get_my_imo_id()
    )
  );

-- IMO admins: access to automations for checklist items in their IMO's templates
CREATE POLICY "pipeline_automations_imo_admin_item"
  ON pipeline_automations
  FOR ALL
  TO authenticated
  USING (
    is_imo_admin()
    AND checklist_item_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM phase_checklist_items pci
      JOIN pipeline_phases pp ON pci.phase_id = pp.id
      JOIN pipeline_templates pt ON pp.template_id = pt.id
      WHERE pci.id = pipeline_automations.checklist_item_id
      AND pt.imo_id = get_my_imo_id()
    )
  )
  WITH CHECK (
    is_imo_admin()
    AND checklist_item_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM phase_checklist_items pci
      JOIN pipeline_phases pp ON pci.phase_id = pp.id
      JOIN pipeline_templates pt ON pp.template_id = pt.id
      WHERE pci.id = pipeline_automations.checklist_item_id
      AND pt.imo_id = get_my_imo_id()
    )
  );

-- Agency owners: read-only access to automations for templates they can use
-- (they can see automations but not modify them - that's IMO admin's job)
CREATE POLICY "pipeline_automations_agency_owner_select"
  ON pipeline_automations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND 'agency_owner' = ANY(up.roles)
    )
    AND (
      (phase_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM pipeline_phases pp
        JOIN pipeline_templates pt ON pp.template_id = pt.id
        WHERE pp.id = pipeline_automations.phase_id
        AND pt.imo_id = get_my_imo_id()
      ))
      OR
      (checklist_item_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM phase_checklist_items pci
        JOIN pipeline_phases pp ON pci.phase_id = pp.id
        JOIN pipeline_templates pt ON pp.template_id = pt.id
        WHERE pci.id = pipeline_automations.checklist_item_id
        AND pt.imo_id = get_my_imo_id()
      ))
    )
  );

-- ============================================
-- PIPELINE_AUTOMATION_LOGS POLICIES
-- ============================================

-- Super admins: full read access to all logs
CREATE POLICY "automation_logs_super_admin_select"
  ON pipeline_automation_logs
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- IMO admins: read access to logs for recruits in their IMO
CREATE POLICY "automation_logs_imo_admin_select"
  ON pipeline_automation_logs
  FOR SELECT
  TO authenticated
  USING (
    is_imo_admin()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = pipeline_automation_logs.recruit_id
      AND up.imo_id = get_my_imo_id()
    )
  );

-- Agency owners: read access to logs for recruits in their agency
CREATE POLICY "automation_logs_agency_owner_select"
  ON pipeline_automation_logs
  FOR SELECT
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

-- Service role can insert/update logs (for edge functions)
-- Note: service_role bypasses RLS by default, but we add explicit policy for clarity
CREATE POLICY "automation_logs_service_insert"
  ON pipeline_automation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "automation_logs_service_update"
  ON pipeline_automation_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- AUTHENTICATED USER INSERT POLICY
-- ============================================
-- Allow authenticated users to insert logs (needed for automation execution)
-- Note: This is permissive because actual access control happens at the
-- automation level, and logs are just records of execution
CREATE POLICY "automation_logs_authenticated_insert"
  ON pipeline_automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can only create logs for automations they can access
    EXISTS (
      SELECT 1 FROM pipeline_automations pa
      WHERE pa.id = automation_id
      AND (
        -- Super admin
        is_super_admin()
        OR
        -- IMO admin for phase-based automation
        (is_imo_admin() AND pa.phase_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM pipeline_phases pp
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pp.id = pa.phase_id
          AND pt.imo_id = get_my_imo_id()
        ))
        OR
        -- IMO admin for item-based automation
        (is_imo_admin() AND pa.checklist_item_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM phase_checklist_items pci
          JOIN pipeline_phases pp ON pci.phase_id = pp.id
          JOIN pipeline_templates pt ON pp.template_id = pt.id
          WHERE pci.id = pa.checklist_item_id
          AND pt.imo_id = get_my_imo_id()
        ))
      )
    )
  );

-- Comments
COMMENT ON POLICY "pipeline_automations_super_admin" ON pipeline_automations IS 'Super admins have full access to all automations';
COMMENT ON POLICY "pipeline_automations_imo_admin_phase" ON pipeline_automations IS 'IMO admins can manage automations for phases in their templates';
COMMENT ON POLICY "pipeline_automations_imo_admin_item" ON pipeline_automations IS 'IMO admins can manage automations for checklist items in their templates';
COMMENT ON POLICY "automation_logs_super_admin_select" ON pipeline_automation_logs IS 'Super admins can view all automation logs';
COMMENT ON POLICY "automation_logs_imo_admin_select" ON pipeline_automation_logs IS 'IMO admins can view logs for recruits in their IMO';
COMMENT ON POLICY "automation_logs_authenticated_insert" ON pipeline_automation_logs IS 'Authenticated users can insert logs for automations they can access';
