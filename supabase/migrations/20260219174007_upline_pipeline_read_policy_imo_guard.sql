-- supabase/migrations/20260219174007_upline_pipeline_read_policy_imo_guard.sql
-- Hardens the upline pipeline read policies added in 20260219171251.
-- Adds imo_id cross-tenant guard: uplines can only read templates/phases
-- that belong to their own IMO (or are system-wide with imo_id IS NULL).
-- Prevents an upline reading a template from a different IMO even if a
-- data integrity issue caused a cross-IMO recruit enrollment.
--
-- Rollback:
--   DROP POLICY IF EXISTS "pipeline_templates_upline_select" ON pipeline_templates;
--   DROP POLICY IF EXISTS "pipeline_phases_upline_select" ON pipeline_phases;
--   (Recreate original versions from migration 20260219171251 if needed.)

-- Drop and replace pipeline_templates policy
DROP POLICY IF EXISTS "pipeline_templates_upline_select" ON pipeline_templates;

CREATE POLICY "pipeline_templates_upline_select"
ON pipeline_templates FOR SELECT
USING (
  (imo_id = get_my_imo_id() OR imo_id IS NULL)
  AND EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE (up.recruiter_id = auth.uid() OR up.upline_id = auth.uid())
      AND up.pipeline_template_id = pipeline_templates.id
  )
);

-- Drop and replace pipeline_phases policy
DROP POLICY IF EXISTS "pipeline_phases_upline_select" ON pipeline_phases;

CREATE POLICY "pipeline_phases_upline_select"
ON pipeline_phases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pipeline_templates pt
    WHERE pt.id = pipeline_phases.template_id
      AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
      AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE (up.recruiter_id = auth.uid() OR up.upline_id = auth.uid())
          AND up.pipeline_template_id = pt.id
      )
  )
);
