-- supabase/migrations/20260218154748_fix_unenroll_pipeline_staff_auth.sql
-- Allow trainer and contracting_manager roles to unenroll recruits from pipelines
-- These are management/staff roles with full IMO-level recruiting authority

CREATE OR REPLACE FUNCTION unenroll_from_pipeline(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  target_user RECORD;
  deleted_checklist_count INT;
  deleted_phase_count INT;
  deleted_log_count INT;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get target user info
  SELECT id, upline_id, imo_id, agency_id INTO target_user
  FROM user_profiles
  WHERE id = target_user_id;

  IF target_user.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Authorization check: must be super_admin, imo_admin of same IMO,
  -- agency_owner of same agency, upline of the target user,
  -- OR a staff role (trainer / contracting_manager) in the same IMO
  IF NOT (
    is_super_admin()
    OR (is_imo_admin() AND target_user.imo_id = get_my_imo_id())
    OR (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = current_user_id
      AND 'agency_owner' = ANY(up.roles)
      AND target_user.agency_id = get_my_agency_id()
    ))
    OR target_user.upline_id = current_user_id
    OR (EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = current_user_id
      AND (
        'trainer' = ANY(up.roles)
        OR 'contracting_manager' = ANY(up.roles)
      )
      AND up.imo_id = target_user.imo_id
    ))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to unenroll this recruit');
  END IF;

  -- Delete checklist progress
  DELETE FROM recruit_checklist_progress
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_checklist_count = ROW_COUNT;

  -- Delete phase progress
  DELETE FROM recruit_phase_progress
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_phase_count = ROW_COUNT;

  -- Delete automation logs (so automations can run again on re-enrollment)
  DELETE FROM pipeline_automation_logs
  WHERE recruit_id = target_user_id;
  GET DIAGNOSTICS deleted_log_count = ROW_COUNT;

  -- Reset user profile pipeline fields
  UPDATE user_profiles
  SET
    pipeline_template_id = NULL,
    onboarding_status = NULL,
    current_onboarding_phase = NULL,
    onboarding_completed_at = NULL
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_checklist_items', deleted_checklist_count,
    'deleted_phases', deleted_phase_count,
    'deleted_automation_logs', deleted_log_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION unenroll_from_pipeline(UUID) TO authenticated;

COMMENT ON FUNCTION unenroll_from_pipeline(UUID) IS 'Unenrolls a recruit from their pipeline, deleting all progress and automation logs so they can be re-enrolled. Authorized for: super_admin, imo_admin, agency_owner, direct upline, trainer, contracting_manager (same IMO).';
