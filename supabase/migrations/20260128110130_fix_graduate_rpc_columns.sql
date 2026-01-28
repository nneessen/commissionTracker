-- supabase/migrations/20260128110130_fix_graduate_rpc_columns.sql
-- Fix: Remove non-existent columns from graduate_recruit_to_agent RPC

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

  -- Perform the graduation update (removed non-existent columns: graduated_at, graduation_notes)
  UPDATE user_profiles
  SET
    roles = ARRAY['agent']::text[],
    onboarding_status = 'completed',
    current_onboarding_phase = 'completed',
    approval_status = 'approved',
    agent_status = 'licensed',
    contract_level = p_contract_level,
    updated_at = v_now
  WHERE id = p_recruit_id;

  -- Log the activity (store graduation info in metadata)
  INSERT INTO user_activity_log (user_id, action, description, metadata)
  VALUES (
    p_recruit_id,
    'graduated_to_agent',
    'Graduated to agent with ' || p_contract_level || '% contract level',
    jsonb_build_object(
      'previous_role', 'recruit',
      'new_role', 'agent',
      'contract_level', p_contract_level,
      'notes', p_notes,
      'graduated_by', v_caller_id,
      'graduated_at', v_now
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
    'contract_level', p_contract_level
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION graduate_recruit_to_agent IS
'Graduates a recruit to agent status.
Authorization: Must be the recruit''s upline or an admin.
Sets: roles=[agent], onboarding_status=completed, approval_status=approved,
      agent_status=licensed, contract_level=specified value.';
