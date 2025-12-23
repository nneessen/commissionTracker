-- Migration: Fix create_notification function to return full row
-- Description: Return the full notification row instead of just UUID to avoid RLS SELECT issues
-- The admin creating a notification for another user cannot SELECT that notification due to RLS

-- Drop the existing function
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ);

-- Recreate with RETURNS SETOF to return the full row
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the user exists (this runs with elevated privileges)
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with id % does not exist', p_user_id;
  END IF;

  -- Insert and return the full notification row
  RETURN QUERY
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    expires_at
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_metadata,
    p_expires_at
  )
  RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO anon;

-- Add comment
COMMENT ON FUNCTION create_notification IS
  'Creates a notification for any user and returns the full row. Uses SECURITY DEFINER to bypass RLS constraints.';
