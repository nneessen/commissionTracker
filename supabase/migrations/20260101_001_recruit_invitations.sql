-- supabase/migrations/20260101_001_recruit_invitations.sql
-- Recruit Self-Registration Invitations
-- Allows recruiters to send email invitations to prospects for self-registration

-- ============================================================================
-- TABLE: recruit_invitations
-- ============================================================================

CREATE TABLE recruit_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the placeholder user_profiles entry
  recruit_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Recruiter who sent the invitation
  inviter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Secure token for public access
  invite_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Email (denormalized for easy lookup and validation)
  email TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'completed', 'expired', 'cancelled')),

  -- Expiration (default 7 days)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Email delivery tracking
  sent_at TIMESTAMPTZ,
  resend_count INTEGER NOT NULL DEFAULT 0,
  last_resent_at TIMESTAMPTZ,

  -- Recruit activity tracking
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Optional personal message from recruiter
  message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE recruit_invitations IS
  'Stores self-registration invitations sent by recruiters to prospects';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Token lookup (most common query for public access)
CREATE UNIQUE INDEX idx_recruit_invitations_token
  ON recruit_invitations(invite_token);

-- Email lookup (for duplicate checking)
CREATE INDEX idx_recruit_invitations_email
  ON recruit_invitations(email);

-- Status filtering
CREATE INDEX idx_recruit_invitations_status
  ON recruit_invitations(status);

-- Recruit lookup
CREATE INDEX idx_recruit_invitations_recruit
  ON recruit_invitations(recruit_id);

-- Inviter lookup (for dashboard)
CREATE INDEX idx_recruit_invitations_inviter
  ON recruit_invitations(inviter_id);

-- Expiration check (for pending/sent only)
CREATE INDEX idx_recruit_invitations_expires
  ON recruit_invitations(expires_at)
  WHERE status IN ('pending', 'sent', 'viewed');

-- ============================================================================
-- TRIGGER: Updated timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_recruit_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recruit_invitations_updated_at
  BEFORE UPDATE ON recruit_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_recruit_invitations_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE recruit_invitations ENABLE ROW LEVEL SECURITY;

-- Recruiters can view invitations they sent
CREATE POLICY "Recruiters can view own invitations"
  ON recruit_invitations FOR SELECT
  USING (inviter_id = auth.uid());

-- Recruiters can view invitations for their downlines
CREATE POLICY "Uplines can view downline invitations"
  ON recruit_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = recruit_invitations.recruit_id
      AND (upline_id = auth.uid() OR recruiter_id = auth.uid())
    )
  );

-- Recruiters can create invitations for their recruits
CREATE POLICY "Recruiters can create invitations"
  ON recruit_invitations FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = recruit_invitations.recruit_id
      AND (recruiter_id = auth.uid() OR upline_id = auth.uid())
    )
  );

-- Recruiters can update their own invitations
CREATE POLICY "Recruiters can update own invitations"
  ON recruit_invitations FOR UPDATE
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- Recruiters can delete their own invitations
CREATE POLICY "Recruiters can delete own invitations"
  ON recruit_invitations FOR DELETE
  USING (inviter_id = auth.uid());

-- Admins can manage all invitations
CREATE POLICY "Admins can manage all invitations"
  ON recruit_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- PUBLIC RPC: Get invitation by token (no auth required)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_invitation_by_token(p_token UUID)
RETURNS JSON AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
  v_recruit user_profiles%ROWTYPE;
  v_inviter user_profiles%ROWTYPE;
BEGIN
  -- Find invitation by token
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE invite_token = p_token
  LIMIT 1;

  -- Check if invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invitation_not_found',
      'message', 'This invitation link is invalid or has been removed.'
    );
  END IF;

  -- Check if cancelled
  IF v_invitation.status = 'cancelled' THEN
    -- Get inviter for contact info
    SELECT * INTO v_inviter FROM user_profiles WHERE id = v_invitation.inviter_id;

    RETURN json_build_object(
      'valid', false,
      'error', 'invitation_cancelled',
      'message', 'This invitation has been cancelled.',
      'inviter_name', CONCAT(v_inviter.first_name, ' ', v_inviter.last_name),
      'inviter_email', v_inviter.email,
      'inviter_phone', v_inviter.phone
    );
  END IF;

  -- Check if already completed
  IF v_invitation.status = 'completed' THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invitation_completed',
      'message', 'You have already completed your registration. Please contact your recruiter if you need to make changes.'
    );
  END IF;

  -- Check expiration
  IF v_invitation.expires_at < NOW() THEN
    -- Update status if not already expired
    UPDATE recruit_invitations
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_invitation.id AND status IN ('pending', 'sent', 'viewed');

    -- Get inviter for contact info
    SELECT * INTO v_inviter FROM user_profiles WHERE id = v_invitation.inviter_id;

    RETURN json_build_object(
      'valid', false,
      'error', 'invitation_expired',
      'message', 'This invitation has expired. Please contact your recruiter for a new invitation.',
      'inviter_name', CONCAT(v_inviter.first_name, ' ', v_inviter.last_name),
      'inviter_email', v_inviter.email,
      'inviter_phone', v_inviter.phone
    );
  END IF;

  -- Get recruit and inviter info (limited fields for privacy)
  SELECT * INTO v_recruit FROM user_profiles WHERE id = v_invitation.recruit_id;
  SELECT * INTO v_inviter FROM user_profiles WHERE id = v_invitation.inviter_id;

  -- Update status to 'viewed' if first time viewing
  IF v_invitation.viewed_at IS NULL THEN
    UPDATE recruit_invitations
    SET
      status = 'viewed',
      viewed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_invitation.id;
  END IF;

  -- Return valid invitation with prefilled data
  RETURN json_build_object(
    'valid', true,
    'invitation_id', v_invitation.id,
    'recruit_id', v_invitation.recruit_id,
    'email', v_invitation.email,
    'message', v_invitation.message,
    'expires_at', v_invitation.expires_at,
    'inviter', json_build_object(
      'name', CONCAT(v_inviter.first_name, ' ', v_inviter.last_name),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to anon for public access
GRANT EXECUTE ON FUNCTION get_public_invitation_by_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_invitation_by_token(UUID) TO authenticated;

-- ============================================================================
-- PUBLIC RPC: Submit recruit registration form
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_recruit_registration(
  p_token UUID,
  p_data JSON
)
RETURNS JSON AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
  v_updated_count INTEGER;
  v_inviter user_profiles%ROWTYPE;
BEGIN
  -- Find valid invitation
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE invite_token = p_token
    AND status IN ('pending', 'sent', 'viewed')
    AND expires_at > NOW()
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_invitation',
      'message', 'This invitation is invalid or has expired. Please contact your recruiter for a new invitation.'
    );
  END IF;

  -- Validate required fields
  IF COALESCE(TRIM(p_data->>'first_name'), '') = '' THEN
    RETURN json_build_object('success', false, 'error', 'validation_error', 'message', 'First name is required.');
  END IF;

  IF COALESCE(TRIM(p_data->>'last_name'), '') = '' THEN
    RETURN json_build_object('success', false, 'error', 'validation_error', 'message', 'Last name is required.');
  END IF;

  -- Update user_profiles with recruit-submitted data
  UPDATE user_profiles
  SET
    first_name = TRIM(p_data->>'first_name'),
    last_name = TRIM(p_data->>'last_name'),
    phone = NULLIF(TRIM(p_data->>'phone'), ''),
    date_of_birth = CASE
      WHEN p_data->>'date_of_birth' IS NOT NULL AND p_data->>'date_of_birth' != ''
      THEN (p_data->>'date_of_birth')::DATE
      ELSE date_of_birth
    END,
    street_address = NULLIF(TRIM(p_data->>'street_address'), ''),
    city = NULLIF(TRIM(p_data->>'city'), ''),
    state = NULLIF(TRIM(p_data->>'state'), ''),
    zip = NULLIF(TRIM(p_data->>'zip'), ''),
    instagram_username = NULLIF(TRIM(p_data->>'instagram_username'), ''),
    linkedin_username = NULLIF(TRIM(p_data->>'linkedin_username'), ''),
    facebook_handle = NULLIF(TRIM(p_data->>'facebook_handle'), ''),
    personal_website = NULLIF(TRIM(p_data->>'personal_website'), ''),
    referral_source = NULLIF(TRIM(p_data->>'referral_source'), ''),
    -- Mark that self-registration is pending review
    onboarding_status = COALESCE(onboarding_status, 'prospect'),
    updated_at = NOW()
  WHERE id = v_invitation.recruit_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'update_failed',
      'message', 'Failed to save your information. Please try again or contact your recruiter.'
    );
  END IF;

  -- Mark invitation as completed
  UPDATE recruit_invitations
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Get inviter info for success message
  SELECT * INTO v_inviter FROM user_profiles WHERE id = v_invitation.inviter_id;

  RETURN json_build_object(
    'success', true,
    'recruit_id', v_invitation.recruit_id,
    'message', 'Your registration has been submitted successfully!',
    'inviter', json_build_object(
      'name', CONCAT(v_inviter.first_name, ' ', v_inviter.last_name),
      'email', v_inviter.email,
      'phone', v_inviter.phone
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to anon for public access
GRANT EXECUTE ON FUNCTION submit_recruit_registration(UUID, JSON) TO anon;
GRANT EXECUTE ON FUNCTION submit_recruit_registration(UUID, JSON) TO authenticated;

-- ============================================================================
-- HELPER RPC: Check for duplicate pending invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION check_pending_invitation_exists(
  p_email TEXT,
  p_inviter_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recruit_invitations
    WHERE email = LOWER(TRIM(p_email))
      AND inviter_id = p_inviter_id
      AND status IN ('pending', 'sent', 'viewed')
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Create invitation (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_recruit_invitation(
  p_recruit_id UUID,
  p_email TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_inviter_id UUID;
  v_invitation_id UUID;
  v_token UUID;
  v_recruit user_profiles%ROWTYPE;
BEGIN
  v_inviter_id := auth.uid();

  IF v_inviter_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized', 'message', 'You must be logged in to send invitations.');
  END IF;

  -- Verify recruit exists and inviter has permission
  SELECT * INTO v_recruit
  FROM user_profiles
  WHERE id = p_recruit_id
    AND (recruiter_id = v_inviter_id OR upline_id = v_inviter_id);

  IF v_recruit.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Recruit not found or you do not have permission.');
  END IF;

  -- Check for existing pending invitation
  IF check_pending_invitation_exists(p_email, v_inviter_id) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate', 'message', 'A pending invitation already exists for this email.');
  END IF;

  -- Generate token
  v_token := gen_random_uuid();

  -- Create invitation
  INSERT INTO recruit_invitations (
    recruit_id,
    inviter_id,
    invite_token,
    email,
    message,
    status
  )
  VALUES (
    p_recruit_id,
    v_inviter_id,
    v_token,
    LOWER(TRIM(p_email)),
    p_message,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Mark invitation as sent (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_invitation_sent(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
BEGIN
  -- Find invitation
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE id = p_invitation_id
    AND inviter_id = auth.uid();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Invitation not found.');
  END IF;

  -- Update status
  UPDATE recruit_invitations
  SET
    status = 'sent',
    sent_at = NOW(),
    updated_at = NOW()
  WHERE id = p_invitation_id;

  RETURN json_build_object('success', true, 'message', 'Invitation marked as sent.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Resend invitation (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION resend_recruit_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
  v_new_token UUID;
BEGIN
  -- Find invitation
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE id = p_invitation_id
    AND inviter_id = auth.uid();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Invitation not found.');
  END IF;

  -- Check resend limit
  IF v_invitation.resend_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'resend_limit', 'message', 'Maximum resend limit reached. Please create a new invitation.');
  END IF;

  -- Generate new token and reset expiration
  v_new_token := gen_random_uuid();

  UPDATE recruit_invitations
  SET
    invite_token = v_new_token,
    status = 'pending',
    expires_at = NOW() + INTERVAL '7 days',
    resend_count = resend_count + 1,
    last_resent_at = NOW(),
    viewed_at = NULL,
    updated_at = NOW()
  WHERE id = p_invitation_id;

  RETURN json_build_object(
    'success', true,
    'token', v_new_token,
    'message', 'Invitation has been resent.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Cancel invitation (authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_recruit_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
  v_invitation recruit_invitations%ROWTYPE;
BEGIN
  -- Find invitation
  SELECT * INTO v_invitation
  FROM recruit_invitations
  WHERE id = p_invitation_id
    AND inviter_id = auth.uid();

  IF v_invitation.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Invitation not found.');
  END IF;

  -- Check if already completed
  IF v_invitation.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'already_completed', 'message', 'Cannot cancel a completed invitation.');
  END IF;

  -- Cancel the invitation
  UPDATE recruit_invitations
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_invitation_id;

  RETURN json_build_object('success', true, 'message', 'Invitation has been cancelled.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: Get pending invitations count (for badge)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_invitations_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM recruit_invitations
    WHERE inviter_id = auth.uid()
      AND status IN ('pending', 'sent', 'viewed')
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
