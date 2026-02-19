-- supabase/migrations/20260219171251_upline_pipeline_read_policy.sql
-- Allow basic-tier uplines to read pipeline_templates and pipeline_phases
-- for recruits they directly manage (recruiter_id or upline_id).
-- Fixes: checklist items not displaying in RecruitBottomPanel for non-admin uplines.

-- Policy: upline can SELECT pipeline_templates that any of their recruits are enrolled in
CREATE POLICY "pipeline_templates_upline_select"
ON pipeline_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE (up.recruiter_id = auth.uid() OR up.upline_id = auth.uid())
      AND up.pipeline_template_id = pipeline_templates.id
  )
);

-- Policy: upline can SELECT pipeline_phases whose parent template is accessible via above
CREATE POLICY "pipeline_phases_upline_select"
ON pipeline_phases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE (up.recruiter_id = auth.uid() OR up.upline_id = auth.uid())
      AND up.pipeline_template_id = pipeline_phases.template_id
  )
);
