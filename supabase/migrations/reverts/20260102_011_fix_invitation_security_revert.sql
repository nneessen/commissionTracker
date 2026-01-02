-- supabase/migrations/reverts/20260102_011_fix_invitation_security_revert.sql
-- Revert: Fix Critical Invitation Security Vulnerability
-- WARNING: Only use this if absolutely necessary. This revert will:
--   1. Restore the old validation function that allows inviting non-existent users
--   2. NOT restore cancelled invitations (data change is irreversible)

-- ============================================================================
-- STEP 1: Restore original validate_invitation_eligibility function
-- ============================================================================
-- This restores the 2-parameter version that allows non-existent users with a warning

DROP FUNCTION IF EXISTS validate_invitation_eligibility(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION validate_invitation_eligibility(
  p_inviter_id UUID,
  p_invitee_email TEXT
)
RETURNS JSON AS $$
DECLARE
  v_invitee_profile user_profiles%ROWTYPE;
  v_pending_invitation hierarchy_invitations%ROWTYPE;
  v_result JSON;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_valid BOOLEAN := TRUE;
BEGIN
  -- Normalize email
  p_invitee_email := LOWER(TRIM(p_invitee_email));

  -- Check if inviter exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_inviter_id) THEN
    v_errors := array_append(v_errors, 'Inviter not found');
    v_valid := FALSE;
  END IF;

  -- Find invitee by email
  SELECT * INTO v_invitee_profile
  FROM user_profiles
  WHERE email = p_invitee_email
  LIMIT 1;

  -- ORIGINAL BEHAVIOR: Warning only for non-existent users (NOT SECURE)
  IF v_invitee_profile.id IS NULL THEN
    v_warnings := array_append(v_warnings, 'Invitee does not have an account yet');
  END IF;

  -- Check for self-invitation
  IF v_invitee_profile.id = p_inviter_id THEN
    v_errors := array_append(v_errors, 'Cannot invite yourself');
    v_valid := FALSE;
  END IF;

  -- Check if invitee already has an upline
  IF v_invitee_profile.upline_id IS NOT NULL THEN
    v_errors := array_append(v_errors, 'User already has an upline');
    v_valid := FALSE;
  END IF;

  -- Check if invitee has downlines (would create circular hierarchy)
  IF EXISTS (
    SELECT 1 FROM user_profiles
    WHERE upline_id = v_invitee_profile.id
    LIMIT 1
  ) THEN
    v_errors := array_append(v_errors, 'User has existing downlines');
    v_valid := FALSE;
  END IF;

  -- Check for existing pending invitation
  SELECT * INTO v_pending_invitation
  FROM hierarchy_invitations
  WHERE inviter_id = p_inviter_id
    AND invitee_email = p_invitee_email
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_pending_invitation.id IS NOT NULL THEN
    v_errors := array_append(v_errors, 'Pending invitation already exists');
    v_valid := FALSE;
  END IF;

  -- Build result JSON
  v_result := json_build_object(
    'valid', v_valid,
    'error_message', array_to_string(v_errors, '; '),
    'warning_message', array_to_string(v_warnings, '; '),
    'inviteeuser_id', v_invitee_profile.id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_invitation_eligibility IS
  'Validates whether an invitation can be sent. WARNING: This is the REVERTED version that allows non-existent users.';

-- ============================================================================
-- NOTE: Cannot uncanel invitations
-- ============================================================================
-- The cancelled invitations from the original migration cannot be restored.
-- If needed, users can manually update specific invitations:
-- UPDATE hierarchy_invitations SET status = 'pending' WHERE id = '<invitation-id>';
