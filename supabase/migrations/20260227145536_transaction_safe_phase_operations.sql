-- Migration: transaction_safe_phase_operations
-- Purpose: Wrap all multi-step recruiting pipeline operations into single-transaction RPCs.
-- Root cause: Client-side sequential DB calls (4N+8 per operation) exhaust connection pool
-- when combined with polling/refetches. This caused full DB lockup on 2026-02-27.
--
-- Functions created:
--   1. advance_recruit_phase — replaces advanceToNextPhase (7-9 calls → 1)
--   2. check_and_auto_advance_phase — replaces checkPhaseAutoAdvancement + advanceToNextPhase chain (14 calls → 1)
--   3. initialize_recruit_progress — replaces initializeRecruitProgress (6 calls → 1)

-- ============================================================================
-- 1. advance_recruit_phase
-- Marks current phase complete, finds next phase, marks it in_progress,
-- initializes checklist progress, updates user_profiles. All in one transaction.
-- ============================================================================

-- Function version: 1
CREATE OR REPLACE FUNCTION public.advance_recruit_phase(
  p_user_id UUID,
  p_current_phase_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_progress RECORD;
  v_current_phase RECORD;
  v_next_phase RECORD;
  v_next_phase_status TEXT;
  v_result JSONB;
BEGIN
  -- 1. Get current phase progress with phase details
  SELECT rpp.*, pp.phase_order, pp.template_id AS phase_template_id
  INTO v_current_progress
  FROM recruit_phase_progress rpp
  JOIN pipeline_phases pp ON pp.id = rpp.phase_id
  WHERE rpp.user_id = p_user_id
    AND rpp.phase_id = p_current_phase_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phase progress not found for user % phase %', p_user_id, p_current_phase_id;
  END IF;

  -- 2. Mark current phase as completed
  UPDATE recruit_phase_progress
  SET status = 'completed',
      completed_at = NOW(),
      notes = COALESCE(notes, '') || ' Auto-completed',
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND phase_id = p_current_phase_id;

  -- 3. Find next active phase (next higher phase_order)
  SELECT pp.*
  INTO v_next_phase
  FROM pipeline_phases pp
  WHERE pp.template_id = v_current_progress.template_id
    AND pp.is_active = true
    AND pp.phase_order > v_current_progress.phase_order
  ORDER BY pp.phase_order ASC
  LIMIT 1;

  IF NOT FOUND THEN
    -- No next phase = recruiting complete
    UPDATE user_profiles
    SET onboarding_status = 'completed',
        onboarding_completed_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'completed', true,
      'next_phase_id', NULL,
      'current_phase_id', p_current_phase_id
    );
  END IF;

  -- 4. Ensure phase progress record exists for next phase, then mark in_progress
  INSERT INTO recruit_phase_progress (user_id, phase_id, template_id, status, started_at, imo_id, agency_id)
  SELECT p_user_id, v_next_phase.id, v_next_phase.template_id, 'in_progress', NOW(),
         up.imo_id, up.agency_id
  FROM user_profiles up
  WHERE up.id = p_user_id
  ON CONFLICT (user_id, phase_id)
  DO UPDATE SET status = 'in_progress', started_at = NOW(), updated_at = NOW();

  -- 5. Initialize checklist progress for next phase (upsert all items as not_started)
  INSERT INTO recruit_checklist_progress (user_id, checklist_item_id, status)
  SELECT p_user_id, pci.id, 'not_started'
  FROM phase_checklist_items pci
  WHERE pci.phase_id = v_next_phase.id
    AND pci.is_active = true
  ON CONFLICT (user_id, checklist_item_id) DO NOTHING;

  -- 6. Update user_profiles with new phase status
  v_next_phase_status := lower(replace(replace(v_next_phase.phase_name, '-', '_'), ' ', '_'));

  UPDATE user_profiles
  SET onboarding_status = v_next_phase_status,
      current_onboarding_phase = v_next_phase.phase_name
  WHERE id = p_user_id;

  -- 7. Return result
  SELECT jsonb_build_object(
    'completed', false,
    'next_phase_id', v_next_phase.id,
    'next_phase_name', v_next_phase.phase_name,
    'next_phase_order', v_next_phase.phase_order,
    'current_phase_id', p_current_phase_id,
    'progress', jsonb_build_object(
      'id', rpp.id,
      'user_id', rpp.user_id,
      'phase_id', rpp.phase_id,
      'template_id', rpp.template_id,
      'status', rpp.status,
      'started_at', rpp.started_at
    )
  )
  INTO v_result
  FROM recruit_phase_progress rpp
  WHERE rpp.user_id = p_user_id
    AND rpp.phase_id = v_next_phase.id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_recruit_phase(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_recruit_phase(UUID, UUID) TO service_role;


-- ============================================================================
-- 2. check_and_auto_advance_phase
-- Checks if all required checklist items are complete, and if auto_advance is
-- enabled on the phase, advances to the next phase. Replaces the 14-call chain:
-- updateChecklistItemStatus → checkPhaseAutoAdvancement → advanceToNextPhase
-- ============================================================================

-- Function version: 1
CREATE OR REPLACE FUNCTION public.check_and_auto_advance_phase(
  p_user_id UUID,
  p_checklist_item_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase RECORD;
  v_required_count INT;
  v_completed_count INT;
  v_all_count INT;
  v_all_completed_count INT;
  v_should_advance BOOLEAN := false;
  v_advance_result JSONB;
BEGIN
  -- 1. Get the phase for this checklist item
  SELECT pp.*
  INTO v_phase
  FROM phase_checklist_items pci
  JOIN pipeline_phases pp ON pp.id = pci.phase_id
  WHERE pci.id = p_checklist_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'checklist_item_not_found');
  END IF;

  -- 2. Check if auto_advance is enabled
  IF NOT v_phase.auto_advance THEN
    RETURN jsonb_build_object('advanced', false, 'reason', 'auto_advance_disabled');
  END IF;

  -- 3. Count required items and their completion status
  SELECT COUNT(*) INTO v_required_count
  FROM phase_checklist_items
  WHERE phase_id = v_phase.id AND is_active = true AND is_required = true;

  IF v_required_count > 0 THEN
    -- Check required items only
    SELECT COUNT(*) INTO v_completed_count
    FROM phase_checklist_items pci
    JOIN recruit_checklist_progress rcp ON rcp.checklist_item_id = pci.id AND rcp.user_id = p_user_id
    WHERE pci.phase_id = v_phase.id
      AND pci.is_active = true
      AND pci.is_required = true
      AND rcp.status IN ('approved', 'completed');

    v_should_advance := (v_completed_count >= v_required_count);
  ELSE
    -- No required items: check ALL items
    SELECT COUNT(*) INTO v_all_count
    FROM phase_checklist_items
    WHERE phase_id = v_phase.id AND is_active = true;

    SELECT COUNT(*) INTO v_all_completed_count
    FROM phase_checklist_items pci
    JOIN recruit_checklist_progress rcp ON rcp.checklist_item_id = pci.id AND rcp.user_id = p_user_id
    WHERE pci.phase_id = v_phase.id
      AND pci.is_active = true
      AND rcp.status IN ('approved', 'completed');

    v_should_advance := (v_all_count > 0 AND v_all_completed_count >= v_all_count);
  END IF;

  -- 4. If all items complete, advance using the advance_recruit_phase function
  IF v_should_advance THEN
    v_advance_result := advance_recruit_phase(p_user_id, v_phase.id);
    RETURN jsonb_build_object(
      'advanced', true,
      'phase_id', v_phase.id,
      'advance_result', v_advance_result
    );
  END IF;

  RETURN jsonb_build_object('advanced', false, 'reason', 'items_incomplete');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_auto_advance_phase(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_auto_advance_phase(UUID, UUID) TO service_role;


-- ============================================================================
-- 3. initialize_recruit_progress
-- Creates all phase progress records + first phase checklist progress +
-- updates user_profiles. Replaces initializeRecruitProgress (6 calls → 1).
-- ============================================================================

-- Function version: 1
CREATE OR REPLACE FUNCTION public.initialize_recruit_progress(
  p_user_id UUID,
  p_template_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_count INT;
  v_user_profile RECORD;
  v_first_phase RECORD;
  v_first_phase_status TEXT;
  v_phase_count INT;
BEGIN
  -- 1. Check if user already has pipeline progress (prevent duplicates)
  SELECT COUNT(*) INTO v_existing_count
  FROM recruit_phase_progress
  WHERE user_id = p_user_id;

  IF v_existing_count > 0 THEN
    -- Return existing progress
    RETURN jsonb_build_object(
      'initialized', false,
      'reason', 'already_enrolled',
      'existing_phases', v_existing_count
    );
  END IF;

  -- 2. Get user profile for RLS fields
  SELECT imo_id, agency_id
  INTO v_user_profile
  FROM user_profiles
  WHERE id = p_user_id;

  -- 3. Get all active phases for template
  SELECT COUNT(*) INTO v_phase_count
  FROM pipeline_phases
  WHERE template_id = p_template_id AND is_active = true;

  IF v_phase_count = 0 THEN
    RAISE EXCEPTION 'No phases found for template %', p_template_id;
  END IF;

  -- 4. Get first phase (lowest phase_order)
  SELECT *
  INTO v_first_phase
  FROM pipeline_phases
  WHERE template_id = p_template_id AND is_active = true
  ORDER BY phase_order ASC
  LIMIT 1;

  -- 5. Create all phase progress records in one INSERT
  INSERT INTO recruit_phase_progress (user_id, phase_id, template_id, status, started_at, imo_id, agency_id)
  SELECT
    p_user_id,
    pp.id,
    p_template_id,
    CASE WHEN pp.id = v_first_phase.id THEN 'in_progress' ELSE 'not_started' END,
    CASE WHEN pp.id = v_first_phase.id THEN NOW() ELSE NULL END,
    v_user_profile.imo_id,
    v_user_profile.agency_id
  FROM pipeline_phases pp
  WHERE pp.template_id = p_template_id AND pp.is_active = true
  ORDER BY pp.phase_order;

  -- 6. Initialize checklist progress for first phase
  INSERT INTO recruit_checklist_progress (user_id, checklist_item_id, status)
  SELECT p_user_id, pci.id, 'not_started'
  FROM phase_checklist_items pci
  WHERE pci.phase_id = v_first_phase.id
    AND pci.is_active = true
  ON CONFLICT (user_id, checklist_item_id) DO NOTHING;

  -- 7. Update user_profiles with first phase status
  v_first_phase_status := lower(replace(replace(v_first_phase.phase_name, '-', '_'), ' ', '_'));

  UPDATE user_profiles
  SET pipeline_template_id = p_template_id,
      onboarding_status = v_first_phase_status,
      current_onboarding_phase = v_first_phase.phase_name
  WHERE id = p_user_id;

  -- 8. Return result
  RETURN jsonb_build_object(
    'initialized', true,
    'template_id', p_template_id,
    'phase_count', v_phase_count,
    'first_phase_id', v_first_phase.id,
    'first_phase_name', v_first_phase.phase_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_recruit_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_recruit_progress(UUID, UUID) TO service_role;
