-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251129_001_insert_default_pipeline_data.sql
-- Migration to insert default pipeline template and phases

-- Create default template if it doesn't exist
INSERT INTO pipeline_templates (
  name,
  description,
  is_active,
  is_default,
  created_by
)
SELECT
  'Standard Onboarding',
  'Default recruiting pipeline for new agents',
  true,
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_templates WHERE is_default = true
);

-- Get the default template ID
DO $$
DECLARE
  default_template_id UUID;
BEGIN
  SELECT id INTO default_template_id
  FROM pipeline_templates
  WHERE is_default = true
  LIMIT 1;

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
    SELECT 1 FROM pipeline_phases WHERE template_id = default_template_id
  );

  -- Create checklist items for each phase (optional - sample items)
  -- Interview 1 Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Complete application form', 'Submit initial application with personal information', 1, true, true, false),
    ('Schedule interview', 'Confirm interview date and time', 2, true, false, false),
    ('Prepare resume', 'Submit updated resume', 3, true, true, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Interview 1'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- Zoom Interview Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Complete Zoom interview', 'Attend and complete virtual interview', 1, true, false, false),
    ('Submit background check consent', 'Provide authorization for background verification', 2, true, true, false),
    ('Complete personality assessment', 'Take online assessment if required', 3, false, false, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Zoom Interview'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- Pre-Licensing Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Enroll in pre-licensing course', 'Register for state-approved course', 1, true, false, false),
    ('Complete coursework', 'Finish all required modules', 2, true, false, false),
    ('Pass practice exams', 'Score 70% or higher on practice tests', 3, true, false, false),
    ('Schedule state exam', 'Book examination appointment', 4, true, false, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Pre-Licensing'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- Exam Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Pass state exam', 'Successfully complete state licensing exam', 1, true, false, false),
    ('Submit exam results', 'Provide proof of passing score', 2, true, true, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Exam'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- NPN Received Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Submit license application', 'Apply for state insurance license', 1, true, false, false),
    ('Receive NPN', 'Obtain National Producer Number', 2, true, true, false),
    ('Upload license copy', 'Provide copy of insurance license', 3, true, true, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'NPN Received'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- Contracting Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Complete carrier applications', 'Submit appointment requests for carriers', 1, true, false, false),
    ('E&O Insurance', 'Obtain Errors & Omissions coverage', 2, true, true, false),
    ('Complete contracting', 'Finalize all carrier appointments', 3, true, false, false),
    ('Set up commission deposits', 'Configure direct deposit information', 4, true, false, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Contracting'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

  -- Bootcamp Phase
  INSERT INTO phase_checklist_items (
    phase_id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  )
  SELECT
    p.id,
    item_name,
    item_description,
    item_order,
    is_required,
    document_required,
    auto_check
  FROM pipeline_phases p
  CROSS JOIN (VALUES
    ('Attend bootcamp training', 'Complete initial field training program', 1, true, false, false),
    ('Shadow experienced agent', 'Observe field appointments', 2, true, false, false),
    ('Complete first sale', 'Close initial policy sale', 3, false, false, false),
    ('Pass final assessment', 'Complete training evaluation', 4, true, false, false)
  ) AS v(item_name, item_description, item_order, is_required, document_required, auto_check)
  WHERE p.template_id = default_template_id
    AND p.phase_name = 'Bootcamp'
    AND NOT EXISTS (
      SELECT 1 FROM phase_checklist_items WHERE phase_id = p.id
    );

END $$;

-- Add comment
COMMENT ON TABLE pipeline_templates IS 'Pipeline templates with configurable phases for recruiting workflows';
COMMENT ON TABLE pipeline_phases IS 'Configurable phases that can be modified by admins without code changes';
COMMENT ON TABLE phase_checklist_items IS 'Checklist items for each phase that can be dynamically managed';