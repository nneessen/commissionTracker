-- supabase/migrations/20260129110250_fix_registration_onboarding_started.sql
-- Fix: Recruits not appearing in upline's personal pipeline
--
-- Problem: Newly registered recruits have onboarding_status='prospect' and
-- onboarding_started_at=NULL, which causes them to be filtered out by the
-- exclude_prospects filter in the personal recruiting pipeline.
--
-- Solution: Set onboarding_started_at=NOW() during registration. This is
-- semantically correct (registration IS when onboarding starts) and makes
-- recruits pass the exclude_prospects filter.

-- ============================================================================
-- STEP 1: Update submit_recruit_registration to set onboarding_started_at
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_recruit_registration(
  p_token UUID,
  p_data JSONB,
  p_auth_user_id UUID DEFAULT NULL
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

  -- Determine which flow to use
  IF p_auth_user_id IS NOT NULL THEN
    -- NEW FLOW: Auth user already created via signUp, update their profile
    v_recruit_id := p_auth_user_id;

    UPDATE user_profiles SET
      email = v_invitation.email,
      first_name = v_first_name,
      last_name = v_last_name,
      phone = COALESCE(NULLIF(TRIM(p_data->>'phone'), ''), v_invitation.phone),
      date_of_birth = v_date_of_birth,
      street_address = NULLIF(TRIM(p_data->>'street_address'), ''),
      city = COALESCE(NULLIF(TRIM(p_data->>'city'), ''), v_invitation.city),
      state = COALESCE(NULLIF(TRIM(p_data->>'state'), ''), v_invitation.state),
      zip = NULLIF(TRIM(p_data->>'zip'), ''),
      instagram_username = NULLIF(TRIM(p_data->>'instagram_username'), ''),
      linkedin_username = NULLIF(TRIM(p_data->>'linkedin_username'), ''),
      facebook_handle = NULLIF(TRIM(p_data->>'facebook_handle'), ''),
      personal_website = NULLIF(TRIM(p_data->>'personal_website'), ''),
      referral_source = NULLIF(TRIM(p_data->>'referral_source'), ''),
      recruiter_id = v_invitation.inviter_id,
      upline_id = COALESCE(v_invitation.upline_id, v_invitation.inviter_id),
      imo_id = v_inviter.imo_id,
      agency_id = v_inviter.agency_id,
      roles = ARRAY['recruit']::TEXT[],
      agent_status = 'unlicensed',
      approval_status = 'approved',  -- Auto-approve since they created their own account
      onboarding_status = 'prospect',
      onboarding_started_at = NOW(),  -- FIX: Set onboarding_started_at so recruit appears in pipeline
      pipeline_template_id = v_default_template_id,
      updated_at = NOW()
    WHERE id = p_auth_user_id;

  ELSIF v_invitation.recruit_id IS NOT NULL THEN
    -- LEGACY FLOW: Recruit already exists, update their info
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
      onboarding_started_at = COALESCE(onboarding_started_at, NOW()),  -- FIX: Set if not already set
      updated_at = NOW()
    WHERE id = v_recruit_id;
  ELSE
    -- OLD FLOW: Create new recruit (no auth user, no existing recruit)
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
      onboarding_started_at,  -- FIX: Added column
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
      NOW(),  -- FIX: Set onboarding_started_at
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

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION submit_recruit_registration(UUID, JSONB, UUID) TO anon, authenticated;

COMMENT ON FUNCTION submit_recruit_registration(UUID, JSONB, UUID) IS
  'Submits recruit registration form. Creates/updates user_profiles record with onboarding_started_at set, updates invite status.';

-- ============================================================================
-- STEP 2: Backfill existing recruits who are missing onboarding_started_at
-- ============================================================================
-- This ensures existing recruits who registered before this fix will also
-- appear in their upline's personal recruiting pipeline.

UPDATE user_profiles
SET onboarding_started_at = COALESCE(created_at, NOW())
WHERE 'recruit' = ANY(roles)
  AND onboarding_started_at IS NULL
  AND (onboarding_status IS NULL OR onboarding_status = 'prospect');
