-- Migration: Add organization awareness to workflows (org templates)
-- Enables IMO admins to create shared workflow templates for their organization
-- Enables IMO members to view and clone org templates

-- ============================================================================
-- 1. Add organization columns to workflows table
-- ============================================================================

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS imo_id uuid REFERENCES imos(id) ON DELETE SET NULL;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_org_template boolean NOT NULL DEFAULT false;

-- Add indexes for org template queries
CREATE INDEX IF NOT EXISTS idx_workflows_imo_template
  ON workflows(imo_id)
  WHERE is_org_template = true;

CREATE INDEX IF NOT EXISTS idx_workflows_org_template_status
  ON workflows(imo_id, status)
  WHERE is_org_template = true;

-- ============================================================================
-- 2. Add RLS policies for org template visibility
-- ============================================================================

-- Policy: IMO members can view org templates from their IMO
CREATE POLICY "IMO members can view org templates" ON workflows
FOR SELECT USING (
  is_org_template = true
  AND imo_id = get_my_imo_id()
);

-- Policy: IMO admins can manage (insert/update/delete) org templates in their IMO
CREATE POLICY "IMO admins can manage org templates" ON workflows
FOR ALL USING (
  is_org_template = true
  AND is_imo_admin()
  AND imo_id = get_my_imo_id()
) WITH CHECK (
  is_org_template = true
  AND is_imo_admin()
  AND imo_id = get_my_imo_id()
);

-- Policy: Super admins can manage all org templates
CREATE POLICY "Super admins can manage all org templates" ON workflows
FOR ALL USING (
  is_super_admin()
  AND is_org_template = true
) WITH CHECK (
  is_super_admin()
  AND is_org_template = true
);

-- ============================================================================
-- 3. Create function to get IMO workflow templates
-- ============================================================================

CREATE OR REPLACE FUNCTION get_imo_workflow_templates()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  status text,
  trigger_type text,
  config jsonb,
  conditions jsonb,
  actions jsonb,
  max_runs_per_day integer,
  max_runs_per_recipient integer,
  cooldown_minutes integer,
  priority integer,
  created_by uuid,
  created_by_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    w.category,
    w.status,
    w.trigger_type,
    w.config,
    w.conditions,
    w.actions,
    w.max_runs_per_day,
    w.max_runs_per_recipient,
    w.cooldown_minutes,
    w.priority,
    w.created_by,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as created_by_name,
    w.created_at,
    w.updated_at
  FROM workflows w
  LEFT JOIN user_profiles up ON w.created_by = up.id
  WHERE
    w.is_org_template = true
    AND w.imo_id = get_my_imo_id()
  ORDER BY w.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_workflow_templates() TO authenticated;

-- ============================================================================
-- 4. Create function to save workflow as org template
-- ============================================================================

CREATE OR REPLACE FUNCTION save_workflow_as_org_template(p_workflow_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_result_id uuid;
BEGIN
  -- Check if user is IMO admin
  IF NOT is_imo_admin() THEN
    RAISE EXCEPTION 'Only IMO admins can create org templates';
  END IF;

  -- Get user's IMO ID
  v_imo_id := get_my_imo_id();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an IMO';
  END IF;

  -- Update the workflow to be an org template
  UPDATE workflows
  SET
    is_org_template = true,
    imo_id = v_imo_id,
    updated_at = now()
  WHERE id = p_workflow_id
    AND created_by = auth.uid()
  RETURNING id INTO v_result_id;

  IF v_result_id IS NULL THEN
    RAISE EXCEPTION 'Workflow not found or you do not own it';
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_workflow_as_org_template(uuid) TO authenticated;

-- ============================================================================
-- 5. Create function to clone org template to personal workflow
-- ============================================================================

CREATE OR REPLACE FUNCTION clone_org_template(
  p_template_id uuid,
  p_new_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_new_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get the template (must be an org template in user's IMO)
  SELECT * INTO v_template
  FROM workflows
  WHERE id = p_template_id
    AND is_org_template = true
    AND imo_id = get_my_imo_id();

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  -- Create new personal workflow from template
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    p_new_name,
    v_template.description,
    v_template.category,
    'draft', -- New workflows start as draft
    v_template.trigger_type,
    v_template.config,
    v_template.conditions,
    v_template.actions,
    v_template.max_runs_per_day,
    v_template.max_runs_per_recipient,
    v_template.cooldown_minutes,
    v_template.priority,
    v_user_id,
    false, -- Personal workflow, not a template
    NULL   -- No IMO association for personal workflows
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION clone_org_template(uuid, text) TO authenticated;

-- ============================================================================
-- 6. Create function to create new org template directly
-- ============================================================================

CREATE OR REPLACE FUNCTION create_org_workflow_template(
  p_name text,
  p_description text,
  p_category text,
  p_trigger_type text,
  p_config jsonb,
  p_conditions jsonb,
  p_actions jsonb,
  p_max_runs_per_day integer DEFAULT 50,
  p_max_runs_per_recipient integer DEFAULT NULL,
  p_cooldown_minutes integer DEFAULT NULL,
  p_priority integer DEFAULT 50
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_new_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is IMO admin
  IF NOT is_imo_admin() THEN
    RAISE EXCEPTION 'Only IMO admins can create org templates';
  END IF;

  -- Get user's IMO ID
  v_imo_id := get_my_imo_id();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an IMO';
  END IF;

  -- Create the org template
  INSERT INTO workflows (
    name,
    description,
    category,
    status,
    trigger_type,
    config,
    conditions,
    actions,
    max_runs_per_day,
    max_runs_per_recipient,
    cooldown_minutes,
    priority,
    created_by,
    is_org_template,
    imo_id
  ) VALUES (
    p_name,
    p_description,
    p_category,
    'draft',
    p_trigger_type,
    p_config,
    p_conditions,
    p_actions,
    p_max_runs_per_day,
    p_max_runs_per_recipient,
    p_cooldown_minutes,
    p_priority,
    v_user_id,
    true,
    v_imo_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_org_workflow_template(text, text, text, text, jsonb, jsonb, jsonb, integer, integer, integer, integer) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN workflows.imo_id IS 'IMO organization for org templates (NULL for personal workflows)';
COMMENT ON COLUMN workflows.is_org_template IS 'Whether this workflow is a shared org template';

COMMENT ON FUNCTION get_imo_workflow_templates() IS
'Returns all org workflow templates in the current user''s IMO';

COMMENT ON FUNCTION save_workflow_as_org_template(uuid) IS
'Converts an existing personal workflow to an org template (IMO admin only)';

COMMENT ON FUNCTION clone_org_template(uuid, text) IS
'Creates a new personal workflow by cloning an org template';

COMMENT ON FUNCTION create_org_workflow_template(text, text, text, text, jsonb, jsonb, jsonb, integer, integer, integer, integer) IS
'Creates a new org workflow template directly (IMO admin only)';
