-- supabase/migrations/20260210120000_remove_linkedin.sql
-- Remove LinkedIn integration and related schema

-- Update views to remove LinkedIn fields
CREATE OR REPLACE VIEW active_user_profiles AS
SELECT
    id,
    email,
    approval_status,
    is_admin,
    approved_by,
    approved_at,
    denied_at,
    denial_reason,
    created_at,
    updated_at,
    upline_id,
    hierarchy_path,
    hierarchy_depth,
    contract_level,
    onboarding_status,
    current_onboarding_phase,
    recruiter_id,
    onboarding_started_at,
    onboarding_completed_at,
    referral_source,
    instagram_username,
    instagram_url,
    first_name,
    last_name,
    phone,
    profile_photo_url,
    roles,
    custom_permissions,
    street_address,
    city,
    state,
    zip,
    date_of_birth,
    license_number,
    npn,
    license_expiration,
    facebook_handle,
    personal_website,
    resident_state,
    agent_status,
    pipeline_template_id,
    licensing_info,
    archived_at,
    archived_by,
    archive_reason
FROM user_profiles;

CREATE OR REPLACE VIEW user_management_view AS
SELECT
    id,
    email,
    approval_status,
    is_admin,
    approved_by,
    approved_at,
    denied_at,
    denial_reason,
    created_at,
    updated_at,
    upline_id,
    hierarchy_path,
    hierarchy_depth,
    contract_level,
    onboarding_status,
    current_onboarding_phase,
    recruiter_id,
    onboarding_started_at,
    onboarding_completed_at,
    referral_source,
    instagram_username,
    instagram_url,
    first_name,
    last_name,
    phone,
    profile_photo_url,
    roles,
    custom_permissions,
    street_address,
    city,
    state,
    zip,
    date_of_birth,
    license_number,
    npn,
    license_expiration,
    facebook_handle,
    personal_website,
    resident_state,
    agent_status,
    pipeline_template_id,
    licensing_info,
    archived_at,
    archived_by,
    archive_reason,
    is_super_admin,
    CASE
        WHEN 'admin'::text = ANY (roles) THEN 'admin'::text
        WHEN 'active_agent'::text = ANY (roles) THEN 'active_agent'::text
        WHEN 'agent'::text = ANY (roles) THEN 'agent'::text
        WHEN 'recruit'::text = ANY (roles) THEN 'recruit'::text
        ELSE 'other'::text
    END AS primary_role,
    CASE
        WHEN onboarding_status IS NOT NULL AND NOT (('active_agent'::text = ANY (roles)) OR ('admin'::text = ANY (roles))) THEN true
        ELSE false
    END AS in_recruiting_pipeline,
    CASE
        WHEN ('active_agent'::text = ANY (roles)) OR ('agent'::text = ANY (roles)) OR is_admin = true THEN true
        ELSE false
    END AS in_users_list
FROM user_profiles;

-- Update submit_recruit_registration to remove LinkedIn fields
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
      onboarding_started_at = NOW(),  -- Set onboarding_started_at so recruit appears in pipeline
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
      facebook_handle = COALESCE(NULLIF(TRIM(p_data->>'facebook_handle'), ''), facebook_handle),
      personal_website = COALESCE(NULLIF(TRIM(p_data->>'personal_website'), ''), personal_website),
      referral_source = COALESCE(NULLIF(TRIM(p_data->>'referral_source'), ''), referral_source),
      onboarding_status = 'prospect',
      onboarding_started_at = COALESCE(onboarding_started_at, NOW()),
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
      onboarding_started_at,
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
      NOW(),
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

GRANT EXECUTE ON FUNCTION submit_recruit_registration(UUID, JSONB, UUID) TO anon, authenticated;

COMMENT ON FUNCTION submit_recruit_registration(UUID, JSONB, UUID) IS
  'Submits recruit registration form. Creates/updates user_profiles record with onboarding_started_at set, updates invite status.';

-- Update admin RPCs to exclude LinkedIn fields
CREATE OR REPLACE FUNCTION admin_get_allusers()
RETURNS TABLE (
  approval_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  city TEXT,
  contract_level INTEGER,
  created_at TIMESTAMPTZ,
  current_onboarding_phase TEXT,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,
  email TEXT,
  first_name TEXT,
  full_name TEXT,
  hierarchy_depth INTEGER,
  hierarchy_path TEXT,
  id UUID,
  instagram_url TEXT,
  is_admin BOOLEAN,
  last_name TEXT,
  license_expiration DATE,
  license_number TEXT,
  npn TEXT,
  onboarding_status TEXT,
  phone TEXT,
  resident_state TEXT,
  roles TEXT[],
  state TEXT,
  street_address TEXT,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  zip TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  RETURN QUERY
  SELECT
    approval_status,
    approved_at,
    approved_by,
    city,
    contract_level,
    created_at,
    current_onboarding_phase,
    denial_reason,
    denied_at,
    email,
    first_name,
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS full_name,
    hierarchy_depth,
    hierarchy_path,
    id,
    instagram_url,
    is_admin,
    last_name,
    license_expiration,
    license_number,
    npn,
    onboarding_status,
    phone,
    resident_state,
    roles,
    state,
    street_address,
    updated_at,
    upline_id,
    zip
  FROM user_profiles;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  approval_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  city TEXT,
  contract_level INTEGER,
  created_at TIMESTAMPTZ,
  current_onboarding_phase TEXT,
  denial_reason TEXT,
  denied_at TIMESTAMPTZ,
  email TEXT,
  first_name TEXT,
  full_name TEXT,
  hierarchy_depth INTEGER,
  hierarchy_path TEXT,
  id UUID,
  instagram_url TEXT,
  is_admin BOOLEAN,
  last_name TEXT,
  license_expiration DATE,
  license_number TEXT,
  npn TEXT,
  onboarding_status TEXT,
  phone TEXT,
  resident_state TEXT,
  roles TEXT[],
  state TEXT,
  street_address TEXT,
  updated_at TIMESTAMPTZ,
  upline_id UUID,
  zip TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  RETURN QUERY
  SELECT
    approval_status,
    approved_at,
    approved_by,
    city,
    contract_level,
    created_at,
    current_onboarding_phase,
    denial_reason,
    denied_at,
    email,
    first_name,
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) AS full_name,
    hierarchy_depth,
    hierarchy_path,
    id,
    instagram_url,
    is_admin,
    last_name,
    license_expiration,
    license_number,
    npn,
    onboarding_status,
    phone,
    resident_state,
    roles,
    state,
    street_address,
    updated_at,
    upline_id,
    zip
  FROM user_profiles;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_allusers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;

-- Remove LinkedIn columns from user_profiles
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS linkedin_username,
  DROP COLUMN IF EXISTS linkedin_url;

-- Remove LinkedIn flag from subscription plans
UPDATE subscription_plans
SET features = features - 'linkedin'
WHERE features ? 'linkedin';

-- Drop LinkedIn / Unipile tables
DROP TABLE IF EXISTS linkedin_scheduled_messages CASCADE;
DROP TABLE IF EXISTS linkedin_usage_tracking CASCADE;
DROP TABLE IF EXISTS linkedin_messages CASCADE;
DROP TABLE IF EXISTS linkedin_conversations CASCADE;
DROP TABLE IF EXISTS linkedin_integrations CASCADE;
DROP TABLE IF EXISTS unipile_config CASCADE;

-- Drop LinkedIn / Unipile functions
DROP FUNCTION IF EXISTS update_linkedin_integrations_updated_at();
DROP FUNCTION IF EXISTS update_linkedin_conversations_updated_at();
DROP FUNCTION IF EXISTS update_linkedin_conversation_on_message();
DROP FUNCTION IF EXISTS update_linkedin_scheduled_updated_at();
DROP FUNCTION IF EXISTS expire_linkedin_scheduled_messages();
DROP FUNCTION IF EXISTS update_unipile_config_updated_at();
DROP FUNCTION IF EXISTS update_unipile_account_count();
DROP FUNCTION IF EXISTS can_add_linkedin_account(UUID);
DROP FUNCTION IF EXISTS user_has_linkedin_access(UUID);
DROP FUNCTION IF EXISTS get_unipile_config(UUID);

-- Drop LinkedIn enum types
DROP TYPE IF EXISTS linkedin_connection_status;
DROP TYPE IF EXISTS linkedin_message_type;
