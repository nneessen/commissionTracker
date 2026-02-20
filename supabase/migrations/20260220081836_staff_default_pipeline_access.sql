-- supabase/migrations/20260220081836_staff_default_pipeline_access.sql
-- Allow trainers/contracting_mgr to edit DEFAULT pipelines

-- ============================================================================
-- ALLOW TRAINERS/CONTRACTING_MGR TO EDIT DEFAULT PIPELINES
-- ============================================================================

-- Drop restrictive policies that limit staff to only their own created templates
DROP POLICY IF EXISTS "pipeline_templates_imo_staff_update" ON pipeline_templates;
DROP POLICY IF EXISTS "pipeline_phases_imo_staff_update" ON pipeline_phases;
DROP POLICY IF EXISTS "phase_checklist_items_imo_staff_update" ON phase_checklist_items;
DROP POLICY IF EXISTS "pipeline_automations_imo_staff_update" ON pipeline_automations;

-- ============================================================================
-- PIPELINE TEMPLATES: Staff can update DEFAULT templates in their IMO
-- ============================================================================
CREATE POLICY "Staff can update DEFAULT templates in IMO" ON pipeline_templates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pipeline_templates.imo_id = up.imo_id OR pipeline_templates.imo_id IS NULL)
    AND pipeline_templates.name ILIKE '%DEFAULT%' -- Only DEFAULT templates
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pipeline_templates.imo_id = up.imo_id OR pipeline_templates.imo_id IS NULL)
    AND pipeline_templates.name ILIKE '%DEFAULT%'
  )
);

-- ============================================================================
-- PIPELINE PHASES: Staff can update phases in DEFAULT templates
-- ============================================================================
CREATE POLICY "Staff can update phases in DEFAULT templates" ON pipeline_phases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_templates pt ON pt.id = pipeline_phases.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_templates pt ON pt.id = pipeline_phases.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- Staff can INSERT phases into DEFAULT templates
CREATE POLICY "Staff can insert phases into DEFAULT templates" ON pipeline_phases FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_templates pt ON pt.id = pipeline_phases.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- Staff can DELETE phases from DEFAULT templates
CREATE POLICY "Staff can delete phases from DEFAULT templates" ON pipeline_phases FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_templates pt ON pt.id = pipeline_phases.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- ============================================================================
-- CHECKLIST ITEMS: Staff can manage items in DEFAULT templates
-- ============================================================================
CREATE POLICY "Staff can update items in DEFAULT templates" ON phase_checklist_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = phase_checklist_items.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = phase_checklist_items.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

CREATE POLICY "Staff can insert items into DEFAULT templates" ON phase_checklist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = phase_checklist_items.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

CREATE POLICY "Staff can delete items from DEFAULT templates" ON phase_checklist_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = phase_checklist_items.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- ============================================================================
-- AUTOMATIONS: Staff can manage automations in DEFAULT templates
-- ============================================================================
CREATE POLICY "Staff can update automations in DEFAULT templates" ON pipeline_automations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = pipeline_automations.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = pipeline_automations.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

CREATE POLICY "Staff can insert automations into DEFAULT templates" ON pipeline_automations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = pipeline_automations.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

CREATE POLICY "Staff can delete automations from DEFAULT templates" ON pipeline_automations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN pipeline_phases pp ON pp.id = pipeline_automations.phase_id
    INNER JOIN pipeline_templates pt ON pt.id = pp.template_id
    WHERE up.id = auth.uid()
    AND (up.roles @> ARRAY['trainer'] OR up.roles @> ARRAY['contracting_manager'])
    AND (pt.imo_id = up.imo_id OR pt.imo_id IS NULL)
    AND pt.name ILIKE '%DEFAULT%'
  )
);

-- Add comments
COMMENT ON POLICY "Staff can update DEFAULT templates in IMO" ON pipeline_templates IS 'Trainers and contracting managers can edit DEFAULT pipelines in their IMO';

-- Track function version
INSERT INTO supabase_migrations.function_versions (function_name, version, description)
VALUES ('staff_default_pipeline_access', '20260220081836', 'Updated RLS policies to allow trainers/contracting_mgr to edit DEFAULT pipelines')
ON CONFLICT (function_name) DO UPDATE SET
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  updated_at = NOW();
