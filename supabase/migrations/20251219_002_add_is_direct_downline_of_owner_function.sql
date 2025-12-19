-- Migration: Add function to check if user is direct downline of owner
-- This function bypasses RLS to check the upline relationship

-- Drop function if exists for idempotency
DROP FUNCTION IF EXISTS is_direct_downline_of_owner(UUID);

-- Create function to check if a user is a direct downline of an owner
CREATE OR REPLACE FUNCTION is_direct_downline_of_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_id UUID;
  v_upline_email TEXT;
  v_owner_emails TEXT[] := ARRAY['nick@nickneessen.com', 'nickneessen@thestandardhq.com'];
BEGIN
  -- Get the user's upline_id
  SELECT upline_id INTO v_upline_id
  FROM user_profiles
  WHERE id = p_user_id;

  -- If no upline, not a direct downline
  IF v_upline_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get the upline's email
  SELECT LOWER(email) INTO v_upline_email
  FROM user_profiles
  WHERE id = v_upline_id;

  -- Check if upline's email is in owner emails (case-insensitive)
  RETURN v_upline_email = ANY(v_owner_emails);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_direct_downline_of_owner(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION is_direct_downline_of_owner(UUID) IS
  'Check if a user is a direct downline of an owner (nick@nickneessen.com or nickneessen@thestandardhq.com).
   Direct downlines get access to Team-tier subscription features.';
