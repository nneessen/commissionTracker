-- supabase/migrations/20260225132622_fix_staff_automation_rls.sql
-- Fix missing SELECT + item-level RLS policies for trainer/contracting_manager
-- on pipeline_automations table.
--
-- Root cause: Original migration 20260220081836 added INSERT/UPDATE/DELETE
-- but NO SELECT policy. PostgreSQL RLS requires SELECT for INSERT's WITH CHECK
-- to evaluate the newly inserted row, causing silent permission denied.
-- Additionally, all existing policies only join through phase_id, missing
-- checklist_item_id-based automations entirely.

-- ============================================================================
-- GAP 1 FIX: Add SELECT policy for phase-based automations
-- ============================================================================
CREATE POLICY "Staff can view automations in DEFAULT templates"
ON pipeline_automations FOR SELECT
USING (
  phase_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = pipeline_automations.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- ============================================================================
-- GAP 2 FIX: Add all CRUD policies for item-based automations
-- ============================================================================

-- SELECT for item-based automations
CREATE POLICY "Staff can view item automations in DEFAULT templates"
ON pipeline_automations FOR SELECT
USING (
  checklist_item_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN phase_checklist_items pci ON pci.id = pipeline_automations.checklist_item_id
    INNER JOIN pipeline_phases pp ON pp.id = pci.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- INSERT for item-based automations
CREATE POLICY "Staff can insert item automations into DEFAULT templates"
ON pipeline_automations FOR INSERT
WITH CHECK (
  checklist_item_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN phase_checklist_items pci ON pci.id = pipeline_automations.checklist_item_id
    INNER JOIN pipeline_phases pp ON pp.id = pci.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- UPDATE for item-based automations
CREATE POLICY "Staff can update item automations in DEFAULT templates"
ON pipeline_automations FOR UPDATE
USING (
  checklist_item_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN phase_checklist_items pci ON pci.id = pipeline_automations.checklist_item_id
    INNER JOIN pipeline_phases pp ON pp.id = pci.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
)
WITH CHECK (
  checklist_item_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN phase_checklist_items pci ON pci.id = pipeline_automations.checklist_item_id
    INNER JOIN pipeline_phases pp ON pp.id = pci.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- DELETE for item-based automations
CREATE POLICY "Staff can delete item automations from DEFAULT templates"
ON pipeline_automations FOR DELETE
USING (
  checklist_item_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN phase_checklist_items pci ON pci.id = pipeline_automations.checklist_item_id
    INNER JOIN pipeline_phases pp ON pp.id = pci.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = (select auth.uid())
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- ============================================================================
-- Version tracking
-- ============================================================================
INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('staff_automation_rls_fix', '20260225132622')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
