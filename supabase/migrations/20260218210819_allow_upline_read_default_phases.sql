-- Allow any authenticated user to read phases belonging to DEFAULT pipeline templates.
-- This enables free-tier uplines to enroll recruits into default pipelines,
-- which requires reading the template's phases to create progress records.

CREATE POLICY pipeline_phases_default_select
  ON pipeline_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pipeline_templates pt
      WHERE pt.id = pipeline_phases.template_id
        AND pt.name ILIKE '%DEFAULT%'
        AND pt.is_active = true
        AND (pt.imo_id = get_my_imo_id() OR pt.imo_id IS NULL)
    )
  );
