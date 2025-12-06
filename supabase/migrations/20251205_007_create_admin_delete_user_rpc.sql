-- Migration: Create admin_delete_user RPC function
-- This function performs a soft-delete on users by setting is_deleted=true

CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
  target_user RECORD;
  result JSONB;
BEGIN
  -- Check if caller is admin
  SELECT
    COALESCE(
      (raw_user_meta_data->>'is_admin')::BOOLEAN,
      FALSE
    ) INTO caller_is_admin
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  -- If not admin, deny access
  IF NOT COALESCE(caller_is_admin, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Admin privileges required'
    );
  END IF;

  -- Check if target user exists and is not already deleted
  SELECT id, email, is_deleted, is_admin
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

  -- Prevent deleting another admin (safety measure)
  IF target_user.is_admin = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete an admin user. Remove admin privileges first.'
    );
  END IF;

  -- Already deleted?
  IF target_user.is_deleted = true THEN
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

  -- Log the deletion
  INSERT INTO user_activity_log (user_id, action, description, metadata)
  VALUES (
    target_user_id,
    'user_deleted',
    'User soft-deleted by admin',
    jsonb_build_object(
      'deleted_by', auth.uid(),
      'deleted_at', NOW(),
      'previous_email', target_user.email
    )
  );

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_delete_user(UUID) IS 'Soft-deletes a user. Admin only. Cannot delete admins or self.';
