-- Migration: Invitation Validation Function
-- Date: 2025-12-17
-- Description: Creates RPC function to validate invitation eligibility and trigger to auto-cancel stale invitations

-- ============================================================================
-- FUNCTION: validate_invitation_eligibility
-- ============================================================================
-- Validates whether an invitation can be sent to a specific email
-- Checks for:
-- - Existing pending invitations
-- - Invitee already in hierarchy (has upline)
-- - Invitee has downlines
-- - Self-invitation
-- Returns structured validation result with errors and warnings

-- Drop existing function if it exists (may have different return type)
DROP FUNCTION IF EXISTS validate_invitation_eligibility(UUID, TEXT);

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

  -- Check for self-invitation
  IF v_invitee_profile.id = p_inviter_id THEN
    v_errors := array_append(v_errors, 'Cannot invite yourself');
    v_valid := FALSE;
  END IF;

  -- Check if invitee already has an upline
  IF v_invitee_profile.id IS NOT NULL AND v_invitee_profile.upline_id IS NOT NULL THEN
    v_errors := array_append(v_errors, 'User already has an upline');
    v_valid := FALSE;
  END IF;

  -- Check if invitee has downlines (would create circular hierarchy)
  IF v_invitee_profile.id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_profiles
      WHERE upline_id = v_invitee_profile.id
      LIMIT 1
    ) THEN
      v_errors := array_append(v_errors, 'User has existing downlines');
      v_valid := FALSE;
    END IF;
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

  -- Add warning if invitee doesn't have an account yet
  IF v_invitee_profile.id IS NULL THEN
    v_warnings := array_append(v_warnings, 'Invitee does not have an account yet');
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_invitation_eligibility(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION validate_invitation_eligibility IS
  'Validates whether an invitation can be sent. Returns JSON with validation results.';

-- ============================================================================
-- TRIGGER: Auto-cancel stale invitations when user joins hierarchy
-- ============================================================================
-- When a user's upline_id is set (they join a hierarchy), automatically cancel
-- any pending invitations they had received from other users

CREATE OR REPLACE FUNCTION auto_cancel_stale_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- If upline_id was just set (user joined a hierarchy)
  IF NEW.upline_id IS NOT NULL AND (OLD.upline_id IS NULL OR OLD.upline_id != NEW.upline_id) THEN

    -- Cancel all pending invitations for this user
    UPDATE hierarchy_invitations
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE invitee_email = NEW.email
      AND status = 'pending'
      AND inviter_id != NEW.upline_id; -- Don't cancel the one they accepted

    -- Log the cancellations
    RAISE NOTICE 'Auto-cancelled stale invitations for user % (joined hierarchy under %)',
      NEW.email, NEW.upline_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_profiles
DROP TRIGGER IF EXISTS trigger_auto_cancel_stale_invitations ON user_profiles;

CREATE TRIGGER trigger_auto_cancel_stale_invitations
  AFTER UPDATE OF upline_id ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_cancel_stale_invitations();

COMMENT ON FUNCTION auto_cancel_stale_invitations IS
  'Automatically cancels pending invitations when a user joins a hierarchy';

COMMENT ON TRIGGER trigger_auto_cancel_stale_invitations ON user_profiles IS
  'Cancels stale invitations when user accepts an invitation and joins a hierarchy';

-- ============================================================================
-- CLEANUP: Mark expired invitations
-- ============================================================================
-- Function to mark expired invitations (can be called manually or via cron)

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update expired pending invitations
  UPDATE hierarchy_invitations
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;

COMMENT ON FUNCTION cleanup_expired_invitations IS
  'Marks expired pending invitations. Returns count of invitations updated.';
