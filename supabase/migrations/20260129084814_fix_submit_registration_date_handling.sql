-- supabase/migrations/20260129084814_fix_submit_registration_date_handling.sql
-- Fix: Handle empty string for date_of_birth in submit_recruit_registration
-- Empty strings should be converted to NULL, not cause a cast error

CREATE OR REPLACE FUNCTION submit_recruit_registration(
  p_token UUID,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
  v_inviter user_profiles%ROWTYPE;
  v_recruit_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_default_template_id UUID;
  v_date_of_birth DATE;
BEGIN
  -- Get invitation with lock
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE invite_token = p_token
  FOR UPDATE;

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invitation_not_found', 'message', 'This invitation link is invalid or has been removed.');
  END IF;

  -- Check if already completed
  IF v_invitation.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'already_completed', 'message', 'This registration has already been completed.');
  END IF;

  -- Check if expired
  IF v_invitation.expires_at < NOW() THEN
    UPDATE recruit_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_invitation.id;
    RETURN json_build_object('success', false, 'error', 'invitation_expired', 'message', 'This invitation has expired.');
  END IF;

  -- Check if cancelled
  IF v_invitation.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'invitation_cancelled', 'message', 'This invitation has been cancelled.');
  END IF;

  -- Get inviter info for imo_id and agency_id
  SELECT * INTO v_inviter
  FROM user_profiles
  WHERE id = v_invitation.inviter_id;

  IF v_inviter.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'inviter_not_found', 'message', 'Inviter profile not found.');
  END IF;

  -- Extract name from form data
  v_first_name := COALESCE(NULLIF(TRIM(p_data->>'first_name'), ''), v_invitation.first_name);
  v_last_name := COALESCE(NULLIF(TRIM(p_data->>'last_name'), ''), v_invitation.last_name);

  -- Parse date_of_birth safely - handle empty strings
  v_date_of_birth := NULL;
  IF p_data->>'date_of_birth' IS NOT NULL AND TRIM(p_data->>'date_of_birth') != '' THEN
    BEGIN
      v_date_of_birth := (p_data->>'date_of_birth')::DATE;
    EXCEPTION WHEN OTHERS THEN
      -- Invalid date format, leave as NULL
      v_date_of_birth := NULL;
    END;
  END IF;

  -- Get default pipeline template for the IMO
  SELECT id INTO v_default_template_id
  FROM pipeline_templates
  WHERE imo_id = v_inviter.imo_id
    AND is_default = true
    AND is_active = true
  LIMIT 1;

  -- If no default, get any active template
  IF v_default_template_id IS NULL THEN
    SELECT id INTO v_default_template_id
    FROM pipeline_templates
    WHERE imo_id = v_inviter.imo_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Create or update recruit profile
  IF v_invitation.recruit_id IS NOT NULL THEN
    -- Recruit already exists (legacy flow), just update their info
    v_recruit_id := v_invitation.recruit_id;

    UPDATE user_profiles SET
      first_name = v_first_name,
      last_name = v_last_name,
      phone = COALESCE(NULLIF(TRIM(p_data->>'phone'), ''), phone),
      date_of_birth = COALESCE(v_date_of_birth, date_of_birth),
      street_address = COALESCE(NULLIF(TRIM(p_data->>'street_address'), ''), street_address),
      city = COALESCE(NULLIF(TRIM(p_data->>'city'), ''), city),
      state = COALESCE(NULLIF(TRIM(p_data->>'state'), ''), state),
      zip = COALESCE(NULLIF(TRIM(p_data->>'zip'), ''), zip),
      instagram_username = COALESCE(NULLIF(TRIM(p_data->>'instagram_username'), ''), instagram_username),
      linkedin_username = COALESCE(NULLIF(TRIM(p_data->>'linkedin_username'), ''), linkedin_username),
      facebook_handle = COALESCE(NULLIF(TRIM(p_data->>'facebook_handle'), ''), facebook_handle),
      personal_website = COALESCE(NULLIF(TRIM(p_data->>'personal_website'), ''), personal_website),
      referral_source = COALESCE(NULLIF(TRIM(p_data->>'referral_source'), ''), referral_source),
      onboarding_status = 'prospect',
      updated_at = NOW()
    WHERE id = v_recruit_id;
  ELSE
    -- Create new recruit (new flow)
    INSERT INTO user_profiles (
      email,
      first_name,
      last_name,
      phone,
      date_of_birth,
      street_address,
      city,
      state,
      zip,
      instagram_username,
      linkedin_username,
      facebook_handle,
      personal_website,
      referral_source,
      recruiter_id,
      upline_id,
      imo_id,
      agency_id,
      roles,
      agent_status,
      approval_status,
      onboarding_status,
      pipeline_template_id,
      hierarchy_path,
      hierarchy_depth
    ) VALUES (
      v_invitation.email,
      v_first_name,
      v_last_name,
      COALESCE(NULLIF(TRIM(p_data->>'phone'), ''), v_invitation.phone),
      v_date_of_birth,
      NULLIF(TRIM(p_data->>'street_address'), ''),
      COALESCE(NULLIF(TRIM(p_data->>'city'), ''), v_invitation.city),
      COALESCE(NULLIF(TRIM(p_data->>'state'), ''), v_invitation.state),
      NULLIF(TRIM(p_data->>'zip'), ''),
      NULLIF(TRIM(p_data->>'instagram_username'), ''),
      NULLIF(TRIM(p_data->>'linkedin_username'), ''),
      NULLIF(TRIM(p_data->>'facebook_handle'), ''),
      NULLIF(TRIM(p_data->>'personal_website'), ''),
      NULLIF(TRIM(p_data->>'referral_source'), ''),
      v_invitation.inviter_id,
      COALESCE(v_invitation.upline_id, v_invitation.inviter_id),
      v_inviter.imo_id,
      v_inviter.agency_id,
      ARRAY['recruit']::TEXT[],
      'unlicensed',
      'pending',
      'prospect',
      v_default_template_id,
      '',
      0
    )
    RETURNING id INTO v_recruit_id;
  END IF;

  -- Link invitation to recruit and mark as completed
  UPDATE recruit_invitations SET
    recruit_id = v_recruit_id,
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'recruit_id', v_recruit_id,
    'message', 'Registration completed successfully.',
    'inviter', json_build_object(
      'name', TRIM(COALESCE(v_inviter.first_name, '') || ' ' || COALESCE(v_inviter.last_name, '')),
      'email', v_inviter.email,
      'phone', v_inviter.phone
    )
  );
END;
$$;

COMMENT ON FUNCTION submit_recruit_registration(UUID, JSONB) IS
  'Submits recruit registration form. Creates user_profiles record if not exists, updates invite status. Handles empty strings gracefully.';
