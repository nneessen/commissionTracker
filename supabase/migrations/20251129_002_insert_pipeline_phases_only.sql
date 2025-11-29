-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251129_002_insert_pipeline_phases_only.sql
-- Migration to insert default pipeline phases

-- Get the default template ID and insert phases
DO $$
DECLARE
  default_template_id UUID;
BEGIN
  -- Get the default template
  SELECT id INTO default_template_id
  FROM pipeline_templates
  WHERE is_default = true
  LIMIT 1;

  -- Skip if no default template exists
  IF default_template_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert phases for the default template if they don't exist
  INSERT INTO pipeline_phases (
    template_id,
    phase_name,
    phase_description,
    phase_order,
    estimated_days,
    auto_advance,
    is_active
  )
  SELECT
    default_template_id,
    phase_name,
    phase_description,
    phase_order,
    estimated_days,
    auto_advance,
    is_active
  FROM (VALUES
    ('Interview 1', 'Initial interview with potential recruit', 1, 1, false, true),
    ('Zoom Interview', 'Virtual interview and assessment', 2, 2, false, true),
    ('Pre-Licensing', 'Study and preparation for licensing exam', 3, 30, false, true),
    ('Exam', 'State licensing examination', 4, 1, false, true),
    ('NPN Received', 'National Producer Number received from state', 5, 7, true, true),
    ('Contracting', 'Carrier appointment and contracting process', 6, 14, false, true),
    ('Bootcamp', 'Initial training and field preparation', 7, 5, false, true)
  ) AS v(phase_name, phase_description, phase_order, estimated_days, auto_advance, is_active)
  WHERE NOT EXISTS (
    SELECT 1 FROM pipeline_phases WHERE template_id = default_template_id AND phase_name = v.phase_name
  );

END $$;