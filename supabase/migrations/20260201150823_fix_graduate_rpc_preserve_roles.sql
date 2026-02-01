-- supabase/migrations/20260201150823_fix_graduate_rpc_preserve_roles.sql
-- Fix: Graduate RPC should preserve existing non-recruit roles
--
-- Problem: Current implementation replaces ALL roles with ARRAY['agent'],
-- losing any other roles the user may have (e.g., 'trainer', 'mentor').
--
-- Solution: Remove 'recruit' role and add 'agent' role while preserving others.

DROP FUNCTION IF EXISTS graduate_recruit_to_agent(uuid, integer, text);

CREATE OR REPLACE FUNCTION graduate_recruit_to_agent(
  p_recruit_id UUID,
  p_contract_level INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_recruit RECORD;
  v_caller RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_new_roles TEXT[];
BEGIN
  -- Get caller's user ID
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get recruit info
  SELECT id, upline_id, first_name, last_name, email, roles
  INTO v_recruit
  FROM user_profiles
  WHERE id = p_recruit_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Recruit not found'
    );
  END IF;

  -- Get caller info
  SELECT id, is_admin, is_super_admin
  INTO v_caller
  FROM user_profiles
  WHERE id = v_caller_id;

  -- Check authorization: caller must be the recruit's upline OR an admin
  IF NOT (
    v_caller.is_admin = true OR
    v_caller.is_super_admin = true OR
    v_recruit.upline_id = v_caller_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authorized to graduate this recruit. You must be their upline or an admin.'
    );
  END IF;

  -- Validate contract level
  IF p_contract_level IS NULL OR p_contract_level < 50 OR p_contract_level > 140 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid contract level. Must be between 50 and 140.'
    );
  END IF;

  -- FIX: Calculate new roles by removing 'recruit' and adding 'agent'
  -- This preserves any other roles the user may have (e.g., 'trainer', 'mentor')
  v_new_roles := array_remove(COALESCE(v_recruit.roles, ARRAY[]::text[]), 'recruit');

  -- Only add 'agent' if not already present
  IF NOT (v_new_roles @> ARRAY['agent']) THEN
    v_new_roles := v_new_roles || ARRAY['agent']::text[];
  END IF;

  -- Perform the graduation update
  UPDATE user_profiles
  SET
    roles = v_new_roles,
    onboarding_status = 'completed',
    current_onboarding_phase = 'completed',
    approval_status = 'approved',
    agent_status = 'licensed',
    contract_level = p_contract_level,
    graduated_at = v_now,
    graduation_notes = p_notes,
    updated_at = v_now
  WHERE id = p_recruit_id;

  -- Log the activity
  INSERT INTO user_activity_log (user_id, action, description, metadata)
  VALUES (
    p_recruit_id,
    'graduated_to_agent',
    'Graduated to agent with ' || p_contract_level || '% contract level',
    jsonb_build_object(
      'previous_roles', v_recruit.roles,
      'new_roles', v_new_roles,
      'contract_level', p_contract_level,
      'notes', p_notes,
      'graduated_by', v_caller_id
    )
  );

  -- Notify the upline if different from caller
  IF v_recruit.upline_id IS NOT NULL AND v_recruit.upline_id != v_caller_id THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_recruit.upline_id,
      'recruit_graduated',
      v_recruit.first_name || ' ' || v_recruit.last_name || ' Graduated!',
      'Your recruit ' || v_recruit.first_name || ' ' || v_recruit.last_name ||
        ' has successfully completed onboarding and is now an active agent with ' ||
        p_contract_level || '% contract level.',
      jsonb_build_object(
        'recruit_id', p_recruit_id,
        'recruit_name', v_recruit.first_name || ' ' || v_recruit.last_name,
        'contract_level', p_contract_level,
        'graduated_at', v_now
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully graduated ' || v_recruit.first_name || ' ' || v_recruit.last_name || ' to agent',
    'recruit_id', p_recruit_id,
    'contract_level', p_contract_level,
    'new_roles', v_new_roles
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION graduate_recruit_to_agent(UUID, INTEGER, TEXT) TO authenticated;

COMMENT ON FUNCTION graduate_recruit_to_agent IS
'Graduates a recruit to agent status.
Authorization: Must be the recruit''s upline or an admin.
FIX: Preserves existing non-recruit roles during graduation.
Sets: roles=(remove recruit, add agent), onboarding_status=completed,
      approval_status=approved, agent_status=licensed, contract_level=specified value.';
