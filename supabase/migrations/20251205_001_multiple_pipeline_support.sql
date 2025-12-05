-- Migration: Multiple Pipeline Support
-- Description: Add support for multiple pipeline templates based on user licensing status
-- Author: System
-- Date: 2025-12-05

-- ============================================================================
-- PART 1: Add new columns to user_profiles table
-- ============================================================================

-- Add agent_status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE agent_status AS ENUM ('unlicensed', 'licensed', 'not_applicable');
  END IF;
END $$;

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS agent_status agent_status DEFAULT 'unlicensed',
ADD COLUMN IF NOT EXISTS pipeline_template_id uuid REFERENCES pipeline_templates(id),
ADD COLUMN IF NOT EXISTS licensing_info jsonb DEFAULT '{}'::jsonb;

-- Create index for pipeline_template_id for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_pipeline_template_id
ON user_profiles(pipeline_template_id);

-- ============================================================================
-- PART 2: Update existing default template
-- ============================================================================

-- First, update the current default template to have a meaningful name
UPDATE pipeline_templates
SET name = 'Standard Recruiting Pipeline',
    description = 'Complete onboarding process for new unlicensed recruits (7 phases)'
WHERE is_default = true AND is_active = true;

-- ============================================================================
-- PART 3: Create new pipeline templates
-- ============================================================================

-- Create Licensed Agent Fast-Track Template
INSERT INTO pipeline_templates (
  id,
  name,
  description,
  is_active,
  is_default,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Licensed Agent Fast-Track',
  'Accelerated onboarding for already licensed insurance agents (3 phases)',
  true,
  false,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Get the ID of the fast-track template we just created
DO $$
DECLARE
  fast_track_template_id uuid;
BEGIN
  SELECT id INTO fast_track_template_id
  FROM pipeline_templates
  WHERE name = 'Licensed Agent Fast-Track'
  LIMIT 1;

  -- Create phases for the Licensed Agent Fast-Track template
  INSERT INTO pipeline_phases (
    id,
    template_id,
    phase_name,
    phase_description,
    phase_order,
    estimated_days,
    auto_advance,
    required_approver_role,
    is_active,
    created_at,
    updated_at
  ) VALUES
  (
    gen_random_uuid(),
    fast_track_template_id,
    'Documentation & Contracts',
    'Submit licensing documents, sign contracts, and complete compliance requirements',
    1,
    2,
    false,
    'contracting_manager',
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    fast_track_template_id,
    'System Training',
    'Learn our CRM, commission tracking, and internal systems',
    2,
    3,
    false,
    'trainer',
    true,
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    fast_track_template_id,
    'Product & Sales Training',
    'Product knowledge and sales process training',
    3,
    5,
    false,
    'trainer',
    true,
    now(),
    now()
  );

  -- Add checklist items for phase 1: Documentation & Contracts
  INSERT INTO phase_checklist_items (
    id,
    phase_id,
    item_name,
    item_description,
    item_type,
    item_order,
    is_required,
    can_be_completed_by,
    requires_verification,
    verification_by,
    is_active,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    p.id,
    item.name,
    item.description,
    item.type,
    item.order_num,
    item.required,
    item.completed_by,
    item.needs_verification,
    item.verified_by,
    true,
    now(),
    now()
  FROM pipeline_phases p
  CROSS JOIN (
    VALUES
      ('Insurance License Upload', 'Upload current insurance license', 'document', 1, true, 'recruit', true, 'contracting_manager'),
      ('NPN Documentation', 'Provide National Producer Number', 'form', 2, true, 'recruit', true, 'contracting_manager'),
      ('E&O Insurance Proof', 'Errors & Omissions insurance documentation', 'document', 3, true, 'recruit', true, 'contracting_manager'),
      ('Agent Contract Signing', 'Sign independent agent agreement', 'signature', 4, true, 'recruit', true, 'admin'),
      ('Commission Split Agreement', 'Review and sign commission structure', 'signature', 5, true, 'recruit', true, 'upline_manager'),
      ('Direct Deposit Setup', 'Complete banking information for commissions', 'form', 6, true, 'recruit', false, null),
      ('Background Check Authorization', 'Authorize background verification', 'signature', 7, true, 'recruit', true, 'admin')
  ) AS item(name, description, type, order_num, required, completed_by, needs_verification, verified_by)
  WHERE p.template_id = fast_track_template_id
    AND p.phase_order = 1;

  -- Add checklist items for phase 2: System Training
  INSERT INTO phase_checklist_items (
    id,
    phase_id,
    item_name,
    item_description,
    item_type,
    item_order,
    is_required,
    can_be_completed_by,
    requires_verification,
    verification_by,
    is_active,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    p.id,
    item.name,
    item.description,
    item.type,
    item.order_num,
    item.required,
    item.completed_by,
    item.needs_verification,
    item.verified_by,
    true,
    now(),
    now()
  FROM pipeline_phases p
  CROSS JOIN (
    VALUES
      ('CRM System Training', 'Complete training on client management system', 'task', 1, true, 'trainer', true, 'trainer'),
      ('Commission Tracking Training', 'Learn commission tracking and reporting', 'task', 2, true, 'trainer', true, 'trainer'),
      ('Lead Management Training', 'Understand lead distribution and management', 'task', 3, true, 'trainer', true, 'trainer'),
      ('Email System Setup', 'Configure email and communication tools', 'form', 4, true, 'recruit', false, null),
      ('Calendar Integration', 'Set up calendar and scheduling system', 'form', 5, false, 'recruit', false, null)
  ) AS item(name, description, type, order_num, required, completed_by, needs_verification, verified_by)
  WHERE p.template_id = fast_track_template_id
    AND p.phase_order = 2;

  -- Add checklist items for phase 3: Product & Sales Training
  INSERT INTO phase_checklist_items (
    id,
    phase_id,
    item_name,
    item_description,
    item_type,
    item_order,
    is_required,
    can_be_completed_by,
    requires_verification,
    verification_by,
    is_active,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    p.id,
    item.name,
    item.description,
    item.type,
    item.order_num,
    item.required,
    item.completed_by,
    item.needs_verification,
    item.verified_by,
    true,
    now(),
    now()
  FROM pipeline_phases p
  CROSS JOIN (
    VALUES
      ('Product Portfolio Review', 'Review all available insurance products', 'task', 1, true, 'trainer', true, 'trainer'),
      ('Sales Process Training', 'Learn company sales methodology', 'task', 2, true, 'trainer', true, 'trainer'),
      ('Carrier Appointments', 'Complete carrier appointment process', 'task', 3, true, 'contracting_manager', true, 'contracting_manager'),
      ('Compliance Training', 'Complete required compliance modules', 'task', 4, true, 'recruit', true, 'admin'),
      ('First Sale Goal Setting', 'Set initial production goals', 'form', 5, true, 'upline_manager', false, null)
  ) AS item(name, description, type, order_num, required, completed_by, needs_verification, verified_by)
  WHERE p.template_id = fast_track_template_id
    AND p.phase_order = 3;

END $$;

-- ============================================================================
-- PART 4: Update existing users
-- ============================================================================

-- Set agent_status for existing users based on their roles
UPDATE user_profiles
SET agent_status = CASE
  WHEN 'admin' = ANY(roles) OR 'office_staff' = ANY(roles) OR 'view_only' = ANY(roles) THEN 'not_applicable'
  WHEN 'agent' = ANY(roles) THEN 'licensed'
  WHEN 'recruit' = ANY(roles) THEN 'unlicensed'
  ELSE 'unlicensed'
END
WHERE agent_status IS NULL;

-- Assign the standard template to existing recruits who have pipeline progress
UPDATE user_profiles up
SET pipeline_template_id = pt.id
FROM pipeline_templates pt
WHERE pt.name = 'Standard Recruiting Pipeline'
  AND 'recruit' = ANY(up.roles)
  AND EXISTS (
    SELECT 1 FROM recruit_phase_progress rpp
    WHERE rpp.user_id = up.id
  );

-- ============================================================================
-- PART 5: Create helper functions
-- ============================================================================

-- Function to get the appropriate pipeline template for a user type
CREATE OR REPLACE FUNCTION get_pipeline_template_for_user(
  p_agent_status agent_status,
  p_roles text[]
) RETURNS uuid AS $$
DECLARE
  v_template_id uuid;
BEGIN
  -- No pipeline for non-agent roles
  IF 'admin' = ANY(p_roles) OR 'office_staff' = ANY(p_roles) OR 'view_only' = ANY(p_roles) THEN
    RETURN NULL;
  END IF;

  -- Licensed agents get fast-track
  IF p_agent_status = 'licensed' THEN
    SELECT id INTO v_template_id
    FROM pipeline_templates
    WHERE name = 'Licensed Agent Fast-Track'
      AND is_active = true
    LIMIT 1;
  -- Unlicensed get standard pipeline
  ELSIF p_agent_status = 'unlicensed' THEN
    SELECT id INTO v_template_id
    FROM pipeline_templates
    WHERE name = 'Standard Recruiting Pipeline'
      AND is_active = true
    LIMIT 1;
  END IF;

  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: Update RLS policies to include pipeline_template_id
-- ============================================================================

-- No RLS changes needed as pipeline_template_id follows same access rules as other user_profiles fields

-- ============================================================================
-- PART 7: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN user_profiles.agent_status IS 'Indicates if the user is a licensed agent, unlicensed recruit, or not applicable (admin/staff)';
COMMENT ON COLUMN user_profiles.pipeline_template_id IS 'The pipeline template assigned to this user for onboarding';
COMMENT ON COLUMN user_profiles.licensing_info IS 'JSON object containing license number, NPN, expiration date, and other licensing details';

COMMENT ON FUNCTION get_pipeline_template_for_user IS 'Returns the appropriate pipeline template ID based on user agent status and roles';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================