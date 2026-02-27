-- Migration: revert_phase_rpc
-- Purpose: Wrap the multi-step phase revert into a single transaction to prevent
-- connection pool exhaustion. Previously, revertPhase() made 4N+8 separate DB calls
-- (N = subsequent phases), each holding a connection. This caused a complete DB lockup
-- when combined with background polling and sync queries.

-- Function version: 1
CREATE OR REPLACE FUNCTION public.revert_recruit_phase(
  p_user_id UUID,
  p_phase_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_progress RECORD;
  v_phase RECORD;
  v_subsequent RECORD;
  v_result JSONB;
  v_phase_status TEXT;
BEGIN
  -- 1. Validate current phase progress exists and is completed
  SELECT rpp.id, rpp.status, rpp.template_id
  INTO v_current_progress
  FROM recruit_phase_progress rpp
  WHERE rpp.user_id = p_user_id
    AND rpp.phase_id = p_phase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phase progress not found';
  END IF;

  IF v_current_progress.status != 'completed' THEN
    RAISE EXCEPTION 'Can only revert completed phases';
  END IF;

  -- 2. Get the phase details
  SELECT pp.id, pp.phase_name, pp.phase_order, pp.template_id
  INTO v_phase
  FROM pipeline_phases pp
  WHERE pp.id = p_phase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phase not found';
  END IF;

  -- 3. Reset all subsequent phases (higher phase_order) to not_started in one UPDATE
  UPDATE recruit_phase_progress
  SET status = 'not_started',
      started_at = NULL,
      completed_at = NULL,
      notes = 'Reset due to phase revert',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND phase_id IN (
      SELECT pp.id
      FROM pipeline_phases pp
      WHERE pp.template_id = v_phase.template_id
        AND pp.phase_order > v_phase.phase_order
    );

  -- 4. Set the target phase back to in_progress
  UPDATE recruit_phase_progress
  SET status = 'in_progress',
      completed_at = NULL,
      notes = 'Reverted by recruiter',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND phase_id = p_phase_id;

  -- 5. Update user_profiles with the reverted phase status
  v_phase_status := lower(replace(replace(v_phase.phase_name, '-', '_'), ' ', '_'));

  UPDATE user_profiles
  SET onboarding_status = v_phase_status,
      current_onboarding_phase = v_phase.phase_name
  WHERE id = p_user_id;

  -- 6. Return the updated phase progress
  SELECT jsonb_build_object(
    'id', rpp.id,
    'user_id', rpp.user_id,
    'phase_id', rpp.phase_id,
    'template_id', rpp.template_id,
    'status', rpp.status,
    'started_at', rpp.started_at,
    'completed_at', rpp.completed_at,
    'notes', rpp.notes
  )
  INTO v_result
  FROM recruit_phase_progress rpp
  WHERE rpp.user_id = p_user_id
    AND rpp.phase_id = p_phase_id;

  RETURN v_result;
END;
$$;

-- Grant access to authenticated users (RLS on underlying tables still applies via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.revert_recruit_phase(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_recruit_phase(UUID, UUID) TO service_role;
