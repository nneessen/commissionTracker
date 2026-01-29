-- Fix: Allow recruits to read their assigned pipeline
-- Bug: "Unknown Phase" due to missing RLS SELECT policies

-- 1. Recruits can read their assigned template ONLY
CREATE POLICY "pipeline_templates_recruit_select"
ON pipeline_templates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND 'recruit' = ANY(up.roles)
    AND up.pipeline_template_id IS NOT NULL
    AND up.pipeline_template_id = pipeline_templates.id
  )
);

-- 2. Recruits can read phases of their assigned template
CREATE POLICY "pipeline_phases_recruit_select"
ON pipeline_phases FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND 'recruit' = ANY(up.roles)
    AND up.pipeline_template_id IS NOT NULL
    AND up.pipeline_template_id = pipeline_phases.template_id
  )
);

-- 3. Enable RLS on phase_checklist_items + add policies
ALTER TABLE phase_checklist_items ENABLE ROW LEVEL SECURITY;

-- Super admins
CREATE POLICY "phase_checklist_items_super_admin_select"
ON phase_checklist_items FOR SELECT TO authenticated
USING (is_super_admin());

-- IMO admins/staff
CREATE POLICY "phase_checklist_items_imo_select"
ON phase_checklist_items FOR SELECT TO authenticated
USING (
  (is_imo_admin() OR is_imo_staff_role())
  AND EXISTS (
    SELECT 1 FROM pipeline_phases pp
    JOIN pipeline_templates pt ON pp.template_id = pt.id
    WHERE pp.id = phase_checklist_items.phase_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
  )
);

-- Agency owners
CREATE POLICY "phase_checklist_items_agency_owner_select"
ON phase_checklist_items FOR SELECT TO authenticated
USING (
  is_agency_owner(NULL::uuid)
  AND EXISTS (
    SELECT 1 FROM pipeline_phases pp
    JOIN pipeline_templates pt ON pp.template_id = pt.id
    WHERE pp.id = phase_checklist_items.phase_id
    AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL OR pt.created_by = auth.uid())
  )
);

-- Recruits
CREATE POLICY "phase_checklist_items_recruit_select"
ON phase_checklist_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN pipeline_phases pp ON pp.id = phase_checklist_items.phase_id
    WHERE up.id = auth.uid()
    AND 'recruit' = ANY(up.roles)
    AND up.pipeline_template_id IS NOT NULL
    AND up.pipeline_template_id = pp.template_id
  )
);

-- 4. Performance index
CREATE INDEX IF NOT EXISTS idx_user_profiles_recruit_pipeline
ON user_profiles(id, pipeline_template_id)
WHERE 'recruit' = ANY(roles);
