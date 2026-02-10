-- Migration: Create delete_recruit RPC for non-admin recruit deletion
-- Date: 2026-02-09
-- Purpose: Allow recruiters/uplines to delete their own recruits without admin privileges.
--          Caller must be the recruit's upline_id, recruiter_id, or an admin.
--          Target must have 'recruit' in their roles array.

CREATE OR REPLACE FUNCTION public.delete_recruit(target_recruit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_caller_id uuid;
  v_is_admin boolean;
  v_target_upline_id uuid;
  v_target_recruiter_id uuid;
  v_target_roles text[];
  v_auth_user_id uuid;
  v_user_email text;
  v_result jsonb;
  v_deleted_count int := 0;
  v_table_counts jsonb := '{}';
BEGIN
  v_caller_id := auth.uid();

  -- Self-delete guard
  IF v_caller_id = target_recruit_id THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Get target recruit info
  SELECT id, email, upline_id, recruiter_id, roles
  INTO v_auth_user_id, v_user_email, v_target_upline_id, v_target_recruiter_id, v_target_roles
  FROM user_profiles
  WHERE id = target_recruit_id;

  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Recruit % not found', target_recruit_id;
  END IF;

  -- Role guard: target must be a recruit
  IF NOT ('recruit' = ANY(COALESCE(v_target_roles, '{}'))) THEN
    RAISE EXCEPTION 'Target user is not a recruit';
  END IF;

  -- Auth: caller must be upline, recruiter, or admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = v_caller_id;

  IF NOT (
    COALESCE(v_is_admin, false)
    OR v_target_upline_id = v_caller_id
    OR v_target_recruiter_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete this recruit';
  END IF;

  -- Delete in correct order (children before parents)

  -- RECRUIT INVITATIONS
  DELETE FROM recruit_invitations
  WHERE recruit_id = target_recruit_id
     OR (recruit_id IS NULL AND email = v_user_email)
     OR inviter_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_invitations', v_deleted_count);

  -- Workflow related
  DELETE FROM workflow_email_tracking WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_email_tracking', v_deleted_count);

  DELETE FROM workflow_rate_limits WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_rate_limits', v_deleted_count);

  -- Activity and audit logs
  DELETE FROM user_activity_log WHERE user_id = target_recruit_id OR performed_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_activity_log', v_deleted_count);

  DELETE FROM system_audit_log WHERE performed_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('system_audit_log', v_deleted_count);

  -- Documents and files
  DELETE FROM user_documents WHERE user_id = target_recruit_id OR uploaded_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_documents', v_deleted_count);

  -- Email related
  DELETE FROM user_emails WHERE user_id = target_recruit_id OR sender_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_emails', v_deleted_count);

  DELETE FROM user_email_oauth_tokens WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_email_oauth_tokens', v_deleted_count);

  DELETE FROM email_watch_subscriptions WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_watch_subscriptions', v_deleted_count);

  DELETE FROM email_quota_tracking WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_quota_tracking', v_deleted_count);

  DELETE FROM email_queue WHERE recipient_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_queue', v_deleted_count);

  DELETE FROM email_triggers WHERE created_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_triggers', v_deleted_count);

  DELETE FROM email_templates WHERE created_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_templates', v_deleted_count);

  -- Messaging
  DELETE FROM messages WHERE sender_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('messages', v_deleted_count);

  DELETE FROM message_threads WHERE created_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('message_threads', v_deleted_count);

  -- Notifications
  DELETE FROM notifications WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('notifications', v_deleted_count);

  -- Recruiting progress
  DELETE FROM recruit_checklist_progress
  WHERE user_id = target_recruit_id
     OR completed_by = target_recruit_id
     OR verified_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_checklist_progress', v_deleted_count);

  DELETE FROM recruit_phase_progress WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_phase_progress', v_deleted_count);

  DELETE FROM onboarding_phases WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('onboarding_phases', v_deleted_count);

  -- Hierarchy
  DELETE FROM hierarchy_invitations
  WHERE inviter_id = target_recruit_id
     OR invitee_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('hierarchy_invitations', v_deleted_count);

  -- Commissions
  DELETE FROM override_commissions
  WHERE base_agent_id = target_recruit_id
     OR override_agent_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('override_commissions', v_deleted_count);

  DELETE FROM commissions WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('commissions', v_deleted_count);

  -- Policies and clients
  DELETE FROM policies WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('policies', v_deleted_count);

  DELETE FROM clients WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('clients', v_deleted_count);

  -- Expenses
  DELETE FROM expenses WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expenses', v_deleted_count);

  DELETE FROM expense_templates WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expense_templates', v_deleted_count);

  -- User settings and targets
  DELETE FROM settings WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('settings', v_deleted_count);

  DELETE FROM user_targets WHERE user_id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_targets', v_deleted_count);

  -- Pipeline templates
  DELETE FROM pipeline_templates WHERE created_by = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('pipeline_templates', v_deleted_count);

  -- Handle user_profiles self-references
  UPDATE user_profiles SET recruiter_id = NULL WHERE recruiter_id = target_recruit_id;
  UPDATE user_profiles SET upline_id = NULL WHERE upline_id = target_recruit_id;
  UPDATE user_profiles SET archived_by = NULL WHERE archived_by = target_recruit_id;

  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = target_recruit_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_profiles', v_deleted_count);

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = v_auth_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('auth_users', v_deleted_count);

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', target_recruit_id,
    'auth_user_id', v_auth_user_id,
    'email', v_user_email,
    'deleted_from_tables', v_table_counts,
    'message', 'Recruit and all related data successfully deleted'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting recruit: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;

COMMENT ON FUNCTION delete_recruit(uuid) IS
'Deletes a recruit and all related data. SECURITY DEFINER to delete from auth.users.
Caller must be the recruit''s upline_id, recruiter_id, or an admin.
Target must have ''recruit'' in their roles array. Cannot delete yourself.';
