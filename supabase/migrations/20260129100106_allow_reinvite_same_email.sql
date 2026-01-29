-- supabase/migrations/20260129100106_allow_reinvite_same_email.sql
-- Fix: Allow re-inviting the same email by cancelling any existing invitation first
-- This prevents the "duplicate invitation" error when trying to resend invites

CREATE OR REPLACE FUNCTION create_recruit_invitation(
  p_email TEXT,
  p_message TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_upline_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id UUID;
  v_invitation_id UUID;
  v_token UUID;
  v_upline UUID;
  v_inviter_profile user_profiles%ROWTYPE;
  v_cancelled_count INT;
BEGIN
  v_inviter_id := auth.uid();

  IF v_inviter_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'You must be logged in to send invitations.');
  END IF;

  -- Get inviter profile for imo_id and agency_id
  SELECT * INTO v_inviter_profile
  FROM user_profiles
  WHERE id = v_inviter_id;

  IF v_inviter_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found', 'message', 'User profile not found.');
  END IF;

  -- Check if email already exists as a user (with an auth account)
  -- Only block if they have an active auth account, not just a deleted profile
  IF EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE LOWER(up.email) = LOWER(TRIM(p_email))
      AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = up.id)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'email_exists', 'message', 'A user with this email already exists.');
  END IF;

  -- Cancel any existing non-completed invitations for this email
  -- This allows re-inviting the same email without errors
  UPDATE recruit_invitations
  SET status = 'cancelled', updated_at = NOW()
  WHERE LOWER(email) = LOWER(TRIM(p_email))
    AND status IN ('pending', 'sent', 'viewed')
  RETURNING 1 INTO v_cancelled_count;

  -- Set upline (default to inviter if not specified)
  v_upline := COALESCE(p_upline_id, v_inviter_id);

  -- Generate token
  v_token := gen_random_uuid();

  -- Create invitation (without recruit_id - user will be created on form submission)
  INSERT INTO recruit_invitations (
    recruit_id,
    inviter_id,
    invite_token,
    email,
    message,
    first_name,
    last_name,
    phone,
    city,
    state,
    upline_id,
    status
  )
  VALUES (
    NULL,  -- No recruit_id yet
    v_inviter_id,
    v_token,
    LOWER(TRIM(p_email)),
    p_message,
    p_first_name,
    p_last_name,
    p_phone,
    p_city,
    p_state,
    v_upline,
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'message', 'Invitation created successfully.'
  );
END;
$$;

COMMENT ON FUNCTION create_recruit_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) IS
  'Creates a recruitment invitation. Cancels any existing pending invitations for the same email.
   User profile is created when registration form is submitted.';
