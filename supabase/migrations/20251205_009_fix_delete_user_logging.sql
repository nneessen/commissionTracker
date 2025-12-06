-- Fix admin_delete_user to use correct column names for user_activity_log

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
  caller_is_super_admin BOOLEAN;
  target_user RECORD;
BEGIN
  -- Get caller's admin status from user_profiles
  SELECT is_admin, COALESCE(is_super_admin, FALSE)
  INTO caller_is_admin, caller_is_super_admin
  FROM user_profiles
  WHERE id = auth.uid();

  -- If not admin at all, deny access
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Admin privileges required'
    );
  END IF;

  -- Check if target user exists
  SELECT id, email, is_deleted, is_admin, COALESCE(is_super_admin, FALSE) as is_super_admin
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
  IF target_user_id = auth.uid() THEN
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

  -- Already deleted?
  IF target_user.is_deleted = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already deleted'
    );
  END IF;

  -- Perform soft-delete
  UPDATE user_profiles
  SET
    is_deleted = true,
    archived_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Log the deletion with correct column names
  BEGIN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (
      target_user_id,
      auth.uid(),
      'user_deleted',
      jsonb_build_object(
        'deleted_at', NOW(),
        'previous_email', target_user.email
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- If logging fails for any reason, continue (deletion already happened)
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
