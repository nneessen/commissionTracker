-- Allow any authenticated user in the same IMO to read DEFAULT pipeline templates.
-- This enables free-tier uplines (with recruiting_basic) to enroll recruits
-- into default pipelines from the BasicRecruitingView bottom panel.
--
-- NOTE: Uses name ILIKE '%DEFAULT%' instead of is_default=true because
-- a trigger (ensure_single_default_template) enforces only ONE is_default=true row,
-- but we need BOTH the licensed and non-licensed DEFAULT templates visible.

-- 1. Rename the licensed pipeline to include DEFAULT
UPDATE pipeline_templates
SET name = 'DEFAULT Licensed Agent Pipeline'
WHERE id = '9d38e508-f714-4258-9674-044a1931ac06';

-- 2. RLS policy: any authenticated user can read DEFAULT active templates in their IMO
CREATE POLICY pipeline_templates_default_select
  ON pipeline_templates
  FOR SELECT
  USING (
    name ILIKE '%DEFAULT%'
    AND is_active = true
    AND (
      imo_id = get_my_imo_id()
      OR imo_id IS NULL
    )
  );
