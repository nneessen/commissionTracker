-- Function to lookup user by email for adding downlines
-- Only callable by approved users
-- Returns minimal user info to check availability

CREATE OR REPLACE FUNCTION lookup_user_by_email(p_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  upline_id UUID,
  is_approved BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_is_approved BOOLEAN;
BEGIN
  -- Check if caller is approved WITHOUT calling is_user_approved() to avoid RLS issues
  -- This queries user_profiles directly, which works because SECURITY DEFINER bypasses RLS
  SELECT
    COALESCE(
      (user_profiles.approval_status = 'approved' OR user_profiles.is_admin = true),
      FALSE
    ) INTO caller_is_approved
  FROM user_profiles
  WHERE user_profiles.id = auth.uid();

  -- If not approved, raise exception
  IF NOT COALESCE(caller_is_approved, FALSE) THEN
    RAISE EXCEPTION 'Only approved users can lookup users by email';
  END IF;

  -- Return user info if exists
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.upline_id,
    (up.approval_status = 'approved' OR up.is_admin = true) as is_approved
  FROM user_profiles up
  WHERE up.email = p_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION lookup_user_by_email(TEXT) TO authenticated;

COMMENT ON FUNCTION lookup_user_by_email IS 'Lookup user by email for adding downlines. Only callable by approved users. Returns minimal info.';
