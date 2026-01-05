-- supabase/migrations/20260105_009_fix_admin_delete_expense_ref.sql
-- Fix: admin_deleteuser references old expense_categories table
-- Should be user_expense_categories after migration 001 rename

CREATE OR REPLACE FUNCTION admin_deleteuser(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
  v_deleted_count int := 0;
  v_table_counts jsonb := '{}';
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User % not found', target_user_id;
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Delete in correct order (children before parents)

  -- Workflow related
  DELETE FROM workflow_email_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_email_tracking', v_deleted_count);

  DELETE FROM workflow_rate_limits WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('workflow_rate_limits', v_deleted_count);

  -- Activity and audit logs
  DELETE FROM user_activity_log WHERE user_id = target_user_id OR performed_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_activity_log', v_deleted_count);

  DELETE FROM system_audit_log WHERE performed_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('system_audit_log', v_deleted_count);

  -- Documents and files
  DELETE FROM user_documents WHERE user_id = target_user_id OR uploaded_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_documents', v_deleted_count);

  -- Email related
  DELETE FROM user_emails WHERE user_id = target_user_id OR sender_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_emails', v_deleted_count);

  DELETE FROM user_email_oauth_tokens WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_email_oauth_tokens', v_deleted_count);

  DELETE FROM email_watch_subscriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_watch_subscriptions', v_deleted_count);

  DELETE FROM email_quota_tracking WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_quota_tracking', v_deleted_count);

  DELETE FROM email_queue WHERE recipient_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_queue', v_deleted_count);

  DELETE FROM email_triggers WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_triggers', v_deleted_count);

  DELETE FROM email_templates WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('email_templates', v_deleted_count);

  -- Messaging
  DELETE FROM messages WHERE sender_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('messages', v_deleted_count);

  DELETE FROM message_threads WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('message_threads', v_deleted_count);

  -- Notifications
  DELETE FROM notifications WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('notifications', v_deleted_count);

  -- Recruiting progress
  DELETE FROM recruit_checklist_progress
  WHERE user_id = target_user_id
     OR completed_by = target_user_id
     OR verified_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_checklist_progress', v_deleted_count);

  DELETE FROM recruit_phase_progress WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('recruit_phase_progress', v_deleted_count);

  DELETE FROM onboarding_phases WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('onboarding_phases', v_deleted_count);

  -- Hierarchy
  DELETE FROM hierarchy_invitations
  WHERE inviter_id = target_user_id
     OR invitee_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('hierarchy_invitations', v_deleted_count);

  -- Commissions
  DELETE FROM override_commissions
  WHERE base_agent_id = target_user_id
     OR override_agent_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('override_commissions', v_deleted_count);

  DELETE FROM commissions WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('commissions', v_deleted_count);

  -- Policies and clients
  DELETE FROM policies WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('policies', v_deleted_count);

  DELETE FROM clients WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('clients', v_deleted_count);

  -- Expenses
  DELETE FROM expenses WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expenses', v_deleted_count);

  DELETE FROM expense_templates WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('expense_templates', v_deleted_count);

  -- FIX: Changed from expense_categories to user_expense_categories
  DELETE FROM user_expense_categories WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_expense_categories', v_deleted_count);

  -- User settings and targets
  DELETE FROM settings WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('settings', v_deleted_count);

  DELETE FROM user_targets WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_targets', v_deleted_count);

  -- Pipeline templates
  DELETE FROM pipeline_templates WHERE created_by = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('pipeline_templates', v_deleted_count);

  -- Handle user_profiles self-references
  UPDATE user_profiles
  SET recruiter_id = NULL
  WHERE recruiter_id = target_user_id;

  UPDATE user_profiles
  SET upline_id = NULL
  WHERE upline_id = target_user_id;

  UPDATE user_profiles
  SET archived_by = NULL
  WHERE archived_by = target_user_id;

  -- Delete the user profile
  DELETE FROM user_profiles WHERE id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('user_profiles', v_deleted_count);

  -- Delete from auth.users (Supabase auth)
  DELETE FROM auth.users WHERE id = target_user_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_table_counts := v_table_counts || jsonb_build_object('auth_users', v_deleted_count);

  -- Build success result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_from_tables', v_table_counts,
    'message', 'User and all related data successfully deleted'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION admin_deleteuser(uuid) IS
'Deletes a user and all related data. Updated 2025-01-05 to use user_expense_categories.';
