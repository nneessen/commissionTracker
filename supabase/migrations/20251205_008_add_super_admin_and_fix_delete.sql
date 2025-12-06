-- Migration: Add is_super_admin flag and update admin_delete_user function
-- Super admins can delete anyone (except themselves)
-- Regular admins cannot delete other admins

-- Add is_super_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Set the primary admin as super admin (nick@nickneessen.com)
UPDATE user_profiles
SET is_super_admin = TRUE
WHERE email = 'nick@nickneessen.com';

-- Update admin_delete_user function with super admin logic
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

  -- Log the deletion (ignore if table doesn't exist)
  BEGIN
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
  EXCEPTION WHEN undefined_table THEN
    -- user_activity_log doesn't exist, skip logging
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_delete_user(UUID) IS 'Soft-deletes a user. Super admins can delete anyone except themselves. Regular admins cannot delete other admins.';
COMMENT ON COLUMN user_profiles.is_super_admin IS 'Super admin flag - can delete other admins and has unrestricted access';
