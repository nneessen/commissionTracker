-- supabase/migrations/20251126224052_seed_default_pipeline_template.sql
-- Seed default pipeline template with 8 phases and checklist items
-- This creates the standard agent onboarding pipeline

-- Insert default template
INSERT INTO pipeline_templates (id, name, description, is_active, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Standard Agent Onboarding',
  'Default 8-phase onboarding process for new insurance agents',
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Insert 8 phases
INSERT INTO pipeline_phases (id, template_id, phase_name, phase_description, phase_order, estimated_days, auto_advance, required_approver_role) VALUES
  ('00000000-0000-0000-0001-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Initial Contact', 'First contact with recruit, phone screening, interest verification', 1, 2, false, 'upline'),
  ('00000000-0000-0000-0001-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Application', 'Submit application documents and background info', 2, 5, true, NULL),
  ('00000000-0000-0000-0001-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Background Check', 'Authorization and completion of background check', 3, 7, true, NULL),
  ('00000000-0000-0000-0001-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Pre-Licensing', 'Complete pre-licensing course and exam', 4, 10, false, 'upline'),
  ('00000000-0000-0000-0001-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Exam', 'Schedule and pass state licensing exam', 5, 21, false, 'upline'),
  ('00000000-0000-0000-0001-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'State License', 'Apply for and receive state insurance license', 6, 14, false, 'upline'),
  ('00000000-0000-0000-0001-000000000007'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Contracting', 'Complete carrier contracts and onboarding paperwork', 7, 7, false, 'upline'),
  ('00000000-0000-0000-0001-000000000008'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Complete', 'Onboarding complete - agent is fully contracted', 8, 0, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert checklist items for each phase

-- Phase 1: Initial Contact (2 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by) VALUES
  ('00000000-0000-0000-0001-000000000001'::uuid, 'manual_approval', 'Phone screening completed', 'Complete initial phone screening to verify interest and qualifications', 1, true, 'upline', false, NULL),
  ('00000000-0000-0000-0001-000000000001'::uuid, 'task_completion', 'Interest form submitted', 'Recruit submits online interest form with basic information', 2, true, 'recruit', false, NULL)
ON CONFLICT DO NOTHING;

-- Phase 2: Application (3 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by, document_type) VALUES
  ('00000000-0000-0000-0001-000000000002'::uuid, 'document_upload', 'Application form', 'Upload completed application form', 1, true, 'recruit', true, 'upline', 'application'),
  ('00000000-0000-0000-0001-000000000002'::uuid, 'document_upload', 'Resume', 'Upload current resume or work history', 2, true, 'recruit', true, 'upline', 'resume'),
  ('00000000-0000-0000-0001-000000000002'::uuid, 'document_upload', 'References', 'Upload professional references (optional)', 3, false, 'recruit', true, 'upline', 'other')
ON CONFLICT DO NOTHING;

-- Phase 3: Background Check (3 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by) VALUES
  ('00000000-0000-0000-0001-000000000003'::uuid, 'signature_required', 'Background check authorization', 'Sign authorization for background check', 1, true, 'recruit', false, NULL),
  ('00000000-0000-0000-0001-000000000003'::uuid, 'task_completion', 'Background check fee paid', 'Pay $50 background check fee and upload receipt', 2, true, 'recruit', false, NULL),
  ('00000000-0000-0000-0001-000000000003'::uuid, 'manual_approval', 'Background check passed', 'Upline verifies background check results', 3, true, 'upline', false, NULL)
ON CONFLICT DO NOTHING;

-- Phase 4: Pre-Licensing (3 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by, external_link) VALUES
  ('00000000-0000-0000-0001-000000000004'::uuid, 'task_completion', 'Pre-licensing course enrollment', 'Enroll in state-approved pre-licensing course', 1, true, 'recruit', false, NULL, NULL),
  ('00000000-0000-0000-0001-000000000004'::uuid, 'training_module', 'Pre-licensing course completed', 'Complete all required pre-licensing coursework', 2, true, 'recruit', false, NULL, 'https://example.com/prelicensing'),
  ('00000000-0000-0000-0001-000000000004'::uuid, 'manual_approval', 'Pre-licensing exam passed', 'Pass pre-licensing exam with required score', 3, true, 'upline', false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Phase 5: Exam (3 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by, document_type) VALUES
  ('00000000-0000-0000-0001-000000000005'::uuid, 'task_completion', 'State exam scheduled', 'Schedule appointment for state licensing exam', 1, true, 'recruit', false, NULL, NULL),
  ('00000000-0000-0000-0001-000000000005'::uuid, 'manual_approval', 'State exam passed', 'Pass state licensing exam', 2, true, 'upline', false, NULL, NULL),
  ('00000000-0000-0000-0001-000000000005'::uuid, 'document_upload', 'Exam results uploaded', 'Upload official exam results documentation', 3, true, 'recruit', true, 'upline', 'certification')
ON CONFLICT DO NOTHING;

-- Phase 6: State License (4 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by) VALUES
  ('00000000-0000-0000-0001-000000000006'::uuid, 'task_completion', 'State license application submitted', 'Submit application to state insurance department', 1, true, 'recruit', false, NULL),
  ('00000000-0000-0000-0001-000000000006'::uuid, 'task_completion', 'State license fee paid', 'Pay state licensing fees', 2, true, 'recruit', false, NULL),
  ('00000000-0000-0000-0001-000000000006'::uuid, 'manual_approval', 'State license approved', 'State approves insurance license', 3, true, 'upline', false, NULL),
  ('00000000-0000-0000-0001-000000000006'::uuid, 'task_completion', 'License number entered', 'Enter official state license number into system', 4, true, 'recruit', false, NULL)
ON CONFLICT DO NOTHING;

-- Phase 7: Contracting (4 items)
INSERT INTO phase_checklist_items (phase_id, item_type, item_name, item_description, item_order, is_required, can_be_completed_by, requires_verification, verification_by, document_type) VALUES
  ('00000000-0000-0000-0001-000000000007'::uuid, 'document_upload', 'Carrier contracts submitted', 'Submit contracting paperwork for all carriers', 1, true, 'recruit', true, 'upline', 'contract'),
  ('00000000-0000-0000-0001-000000000007'::uuid, 'document_upload', 'E&O insurance obtained', 'Obtain and upload Errors & Omissions insurance certificate', 2, true, 'recruit', true, 'upline', 'certification'),
  ('00000000-0000-0000-0001-000000000007'::uuid, 'manual_approval', 'Commission structure agreed', 'Review and approve commission split agreement', 3, true, 'upline', false, NULL, NULL),
  ('00000000-0000-0000-0001-000000000007'::uuid, 'manual_approval', 'Onboarding paperwork complete', 'All final onboarding documents submitted and approved', 4, true, 'upline', false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Phase 8: Complete (no checklist items - just marks completion)
-- No items needed

/*
-- ROLLBACK (if needed):
DELETE FROM phase_checklist_items WHERE phase_id IN (
  SELECT id FROM pipeline_phases WHERE template_id = '00000000-0000-0000-0000-000000000001'::uuid
);
DELETE FROM pipeline_phases WHERE template_id = '00000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM pipeline_templates WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
*/
