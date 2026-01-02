-- supabase/migrations/20260102_004_defer_recruit_creation.sql
-- Defer recruit user_profiles creation until registration form is submitted
-- This allows invitations to exist without a user record

-- ============================================================================
-- STEP 1: Schema Changes
-- ============================================================================

-- Make recruit_id nullable
ALTER TABLE recruit_invitations
  ALTER COLUMN recruit_id DROP NOT NULL;

-- Add columns to store recruit info before user creation
ALTER TABLE recruit_invitations
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS upline_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add constraint: completed invitations must have recruit_id
ALTER TABLE recruit_invitations
  DROP CONSTRAINT IF EXISTS check_recruit_id_on_complete;

ALTER TABLE recruit_invitations
  ADD CONSTRAINT check_recruit_id_on_complete
  CHECK (
    status != 'completed' OR
    (status = 'completed' AND recruit_id IS NOT NULL)
  );

-- ============================================================================
-- STEP 2: Update RLS Policies
-- ============================================================================

-- Drop and recreate policies that depend on recruit_id
DROP POLICY IF EXISTS "Recruiters can create invitations" ON recruit_invitations;
DROP POLICY IF EXISTS "Uplines can view downline invitations" ON recruit_invitations;

-- New INSERT policy - allow creating invitations without recruit_id
CREATE POLICY "Recruiters can create invitations" ON recruit_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
  );

-- New SELECT policy for uplines - handle null recruit_id
CREATE POLICY "Uplines can view downline invitations" ON recruit_invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid()
    OR
    (recruit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = recruit_invitations.recruit_id
      AND (user_profiles.upline_id = auth.uid() OR user_profiles.recruiter_id = auth.uid())
    ))
  );

-- ============================================================================
-- STEP 3: Replace create_recruit_invitation RPC
-- ============================================================================

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

  -- Check if email already exists as a user
  IF EXISTS (SELECT 1 FROM user_profiles WHERE LOWER(email) = LOWER(TRIM(p_email))) THEN
    RETURN json_build_object('success', false, 'error', 'email_exists', 'message', 'A user with this email already exists.');
  END IF;

  -- Check for existing pending invitation for this email by this inviter
  IF EXISTS (
    SELECT 1 FROM recruit_invitations
    WHERE LOWER(email) = LOWER(TRIM(p_email))
      AND inviter_id = v_inviter_id
      AND status IN ('pending', 'sent', 'viewed')
      AND expires_at > NOW()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate', 'message', 'A pending invitation already exists for this email.');
  END IF;

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
  'Creates a recruitment invitation without creating a user. User is created when registration form is submitted.';

-- ============================================================================
-- STEP 4: Replace get_public_invitation_by_token RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_invitation_by_token(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
  v_inviter user_profiles%ROWTYPE;
  v_recruit user_profiles%ROWTYPE;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE invite_token = p_token;

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'invitation_not_found', 'message', 'This invitation link is invalid or has been removed.');
  END IF;

  -- Check status
  IF v_invitation.status = 'cancelled' THEN
    RETURN json_build_object('valid', false, 'error', 'invitation_cancelled', 'message', 'This invitation has been cancelled.');
  END IF;

  IF v_invitation.status = 'completed' THEN
    RETURN json_build_object('valid', false, 'error', 'invitation_completed', 'message', 'This invitation has already been used.');
  END IF;

  IF v_invitation.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE recruit_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_invitation.id;
    RETURN json_build_object('valid', false, 'error', 'invitation_expired', 'message', 'This invitation has expired. Please contact your recruiter for a new invitation.');
  END IF;

  -- Mark as viewed if not already
  IF v_invitation.viewed_at IS NULL THEN
    UPDATE recruit_invitations SET viewed_at = NOW(), status = 'viewed', updated_at = NOW() WHERE id = v_invitation.id;
  END IF;

  -- Get inviter info
  SELECT * INTO v_inviter
  FROM user_profiles
  WHERE id = v_invitation.inviter_id;

  -- Get prefilled data (either from invite or from recruit if already created)
  IF v_invitation.recruit_id IS NOT NULL THEN
    -- Recruit already exists, use their data
    SELECT * INTO v_recruit
    FROM user_profiles
    WHERE id = v_invitation.recruit_id;

    RETURN json_build_object(
      'valid', true,
      'invitation_id', v_invitation.id,
      'recruit_id', v_invitation.recruit_id,
      'email', v_invitation.email,
      'message', v_invitation.message,
      'expires_at', v_invitation.expires_at,
      'inviter', json_build_object(
        'name', TRIM(COALESCE(v_inviter.first_name, '') || ' ' || COALESCE(v_inviter.last_name, '')),
        'email', v_inviter.email,
        'phone', v_inviter.phone
      ),
      'prefilled', json_build_object(
        'first_name', v_recruit.first_name,
        'last_name', v_recruit.last_name,
        'phone', v_recruit.phone,
        'city', v_recruit.city,
        'state', v_recruit.state
      )
    );
  ELSE
    -- Recruit not created yet, use invitation data
    RETURN json_build_object(
      'valid', true,
      'invitation_id', v_invitation.id,
      'recruit_id', NULL,
      'email', v_invitation.email,
      'message', v_invitation.message,
      'expires_at', v_invitation.expires_at,
      'inviter', json_build_object(
        'name', TRIM(COALESCE(v_inviter.first_name, '') || ' ' || COALESCE(v_inviter.last_name, '')),
        'email', v_inviter.email,
        'phone', v_inviter.phone
      ),
      'prefilled', json_build_object(
        'first_name', v_invitation.first_name,
        'last_name', v_invitation.last_name,
        'phone', v_invitation.phone,
        'city', v_invitation.city,
        'state', v_invitation.state
      )
    );
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: Replace submit_recruit_registration RPC
-- ============================================================================

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
  v_first_name := COALESCE(p_data->>'first_name', v_invitation.first_name);
  v_last_name := COALESCE(p_data->>'last_name', v_invitation.last_name);

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
      phone = COALESCE(p_data->>'phone', phone),
      date_of_birth = COALESCE((p_data->>'date_of_birth')::DATE, date_of_birth),
      street_address = COALESCE(p_data->>'street_address', street_address),
      city = COALESCE(p_data->>'city', city),
      state = COALESCE(p_data->>'state', state),
      zip = COALESCE(p_data->>'zip', zip),
      instagram_username = COALESCE(p_data->>'instagram_username', instagram_username),
      linkedin_username = COALESCE(p_data->>'linkedin_username', linkedin_username),
      facebook_handle = COALESCE(p_data->>'facebook_handle', facebook_handle),
      personal_website = COALESCE(p_data->>'personal_website', personal_website),
      referral_source = COALESCE(p_data->>'referral_source', referral_source),
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
      COALESCE(p_data->>'phone', v_invitation.phone),
      (p_data->>'date_of_birth')::DATE,
      p_data->>'street_address',
      COALESCE(p_data->>'city', v_invitation.city),
      COALESCE(p_data->>'state', v_invitation.state),
      p_data->>'zip',
      p_data->>'instagram_username',
      p_data->>'linkedin_username',
      p_data->>'facebook_handle',
      p_data->>'personal_website',
      p_data->>'referral_source',
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
  'Submits recruit registration form. Creates user_profiles record if not exists, updates invite status.';

-- ============================================================================
-- STEP 6: Grant Permissions
-- ============================================================================

-- Ensure the new RPC signatures are accessible
GRANT EXECUTE ON FUNCTION create_recruit_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_invitation_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_recruit_registration(UUID, JSONB) TO anon, authenticated;
