-- Migration: RPC for validating hierarchy changes
-- Purpose: Bypass RLS to validate agent and upline exist before hierarchy update
-- Date: 2026-01-13

-- Function to validate a hierarchy change request
-- Returns JSON with valid: boolean, errors: string[], warnings: string[]
CREATE OR REPLACE FUNCTION validate_hierarchy_change(
  p_agent_id UUID,
  p_new_upline_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_upline RECORD;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get agent profile
  SELECT id, hierarchy_path, email
  INTO v_agent
  FROM user_profiles
  WHERE id = p_agent_id;

  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Agent not found');
    RETURN json_build_object(
      'valid', false,
      'errors', v_errors,
      'warnings', v_warnings
    );
  END IF;

  -- If setting upline to null, it's valid (becoming root agent)
  IF p_new_upline_id IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'errors', ARRAY[]::TEXT[],
      'warnings', ARRAY[]::TEXT[]
    );
  END IF;

  -- Get proposed upline profile
  SELECT id, hierarchy_path, email
  INTO v_upline
  FROM user_profiles
  WHERE id = p_new_upline_id;

  IF NOT FOUND THEN
    v_errors := array_append(v_errors, 'Proposed upline not found');
    RETURN json_build_object(
      'valid', false,
      'errors', v_errors,
      'warnings', v_warnings
    );
  END IF;

  -- Check if proposed upline is in agent's downline tree (would create cycle)
  IF v_upline.hierarchy_path IS NOT NULL AND v_agent.id::TEXT = ANY(string_to_array(v_upline.hierarchy_path, '.')) THEN
    v_errors := array_append(v_errors, 'Cannot set upline to one of your downlines (would create circular reference)');
  END IF;

  RETURN json_build_object(
    'valid', array_length(v_errors, 1) IS NULL,
    'errors', v_errors,
    'warnings', v_warnings
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_hierarchy_change(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION validate_hierarchy_change IS
'Validates a hierarchy change request (upline assignment).
Checks: agent exists, upline exists, no circular reference.
Uses SECURITY DEFINER to bypass RLS for validation queries.';
