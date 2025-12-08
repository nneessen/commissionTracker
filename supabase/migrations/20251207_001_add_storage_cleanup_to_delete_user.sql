-- Migration: Add storage cleanup to admin_delete_user RPC
-- This updates the admin_delete_user function to also clean up storage files
-- before deleting user_documents and user_email_attachments records

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
  caller_is_super_admin BOOLEAN;
  target_user RECORD;
  target_auth_user_id UUID;
  doc_path TEXT;
  attachment_path TEXT;
BEGIN
  -- Get caller's admin status from user_profiles
  SELECT is_admin, COALESCE(is_super_admin, FALSE)
  INTO caller_is_admin, caller_is_super_admin
  FROM user_profiles
  WHERE user_id = auth.uid();

  -- If not admin at all, deny access
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Admin privileges required'
    );
  END IF;

  -- Check if target user exists and get their data
  SELECT id, email, is_deleted, is_admin, COALESCE(is_super_admin, FALSE) as is_super_admin, user_id
  INTO target_user
  FROM user_profiles
  WHERE id = target_user_id;

  IF target_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Prevent deleting yourself
  IF target_user.user_id = auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete your own account'
    );
  END IF;

  -- Prevent deleting a super admin (nobody can delete super admins)
  IF target_user.is_super_admin = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete a super admin'
    );
  END IF;

  -- If target is an admin, only super admins can delete them
  IF target_user.is_admin = TRUE AND caller_is_super_admin = FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can delete other admins'
    );
  END IF;

  -- Store the auth user_id before we delete the profile
  target_auth_user_id := target_user.user_id;

  -- Delete in correct order (handle foreign key constraints)
  -- Clear self-referencing FKs first
  UPDATE user_profiles SET archived_by = NULL WHERE archived_by = target_user_id;
  UPDATE user_profiles SET recruiter_id = NULL WHERE recruiter_id = target_user_id;
  UPDATE user_profiles SET upline_id = NULL WHERE upline_id = target_user_id;

  -- Delete from child tables
  DELETE FROM recruit_checklist_progress WHERE user_id = target_user_id OR completed_by = target_user_id OR verified_by = target_user_id;
  DELETE FROM recruit_phase_progress WHERE user_id = target_user_id;
  DELETE FROM onboarding_phases WHERE user_id = target_user_id;
  DELETE FROM user_activity_log WHERE user_id = target_user_id OR performed_by = target_user_id;

  -- Clean up storage files for email attachments before deleting records
  -- Get paths and delete from storage.objects
  FOR attachment_path IN
    SELECT uea.storage_path
    FROM user_email_attachments uea
    INNER JOIN user_emails ue ON uea.email_id = ue.id
    WHERE ue.user_id = target_user_id
  LOOP
    BEGIN
      -- Try to delete from storage.objects
      -- The storage_path format is typically: bucket_name/path/to/file or just path/to/file
      DELETE FROM storage.objects
      WHERE name = attachment_path
         OR name = split_part(attachment_path, '/', 2) || '/' || split_part(attachment_path, '/', 3)
         OR name LIKE '%' || split_part(attachment_path, '/', -1);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore storage deletion errors (file might already be gone)
      NULL;
    END;
  END LOOP;

  DELETE FROM user_email_attachments WHERE email_id IN (SELECT id FROM user_emails WHERE user_id = target_user_id);
  DELETE FROM user_emails WHERE user_id = target_user_id OR sender_id = target_user_id;

  -- Clean up storage files for documents before deleting records
  FOR doc_path IN
    SELECT storage_path FROM user_documents
    WHERE user_id = target_user_id OR uploaded_by = target_user_id
  LOOP
    BEGIN
      -- Try to delete from storage.objects
      DELETE FROM storage.objects
      WHERE name = doc_path
         OR name = split_part(doc_path, '/', 2) || '/' || split_part(doc_path, '/', 3)
         OR name LIKE '%' || split_part(doc_path, '/', -1);
    EXCEPTION WHEN OTHERS THEN
      -- Ignore storage deletion errors (file might already be gone)
      NULL;
    END;
  END LOOP;

  DELETE FROM user_documents WHERE user_id = target_user_id OR uploaded_by = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM email_quota_tracking WHERE user_id = target_user_id;
  DELETE FROM email_watch_subscriptions WHERE user_id = target_user_id;
  DELETE FROM user_email_oauth_tokens WHERE user_id = target_user_id;
  DELETE FROM override_commissions WHERE base_agent_id = target_user_id OR override_agent_id = target_user_id;
  DELETE FROM messages WHERE sender_id = target_user_id;
  DELETE FROM message_threads WHERE created_by = target_user_id;

  -- Update tables that use SET NULL on delete
  UPDATE email_templates SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE email_triggers SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE pipeline_templates SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE system_audit_log SET performed_by = NULL WHERE performed_by = target_user_id;

  -- Now delete the user profile
  DELETE FROM user_profiles WHERE id = target_user_id;

  -- If there was a linked auth user, delete them too
  IF target_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = target_auth_user_id;
  END IF;

  -- Log the deletion to system audit
  BEGIN
    INSERT INTO system_audit_log (action, table_name, record_id, data, performed_by, performed_at)
    VALUES (
      'hard_delete',
      'user_profiles',
      target_user_id,
      jsonb_build_object(
        'deleted_email', target_user.email,
        'had_auth_user', target_auth_user_id IS NOT NULL
      ),
      auth.uid(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore logging errors
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User permanently deleted'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION admin_delete_user(UUID) IS 'Hard delete a user and all associated data including storage files. Admin only.';
