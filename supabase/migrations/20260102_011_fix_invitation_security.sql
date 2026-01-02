-- supabase/migrations/20260102_011_fix_invitation_security.sql
-- Migration: Fix Critical Invitation Security Vulnerability
-- Date: 2026-01-02
-- Description:
--   1. Block invitations to non-existent users (change warning to error)
--   2. Clean up orphaned invitations (invitee_id = NULL with no matching user)
--
-- Security Issue Fixed:
--   Previously, users could invite non-existent emails which created orphaned
--   invitations. Clicking "resend" would send emails, and when recipients
--   created accounts and accepted, they were auto-approved without admin review.

-- ============================================================================
-- STEP 1: Update validate_invitation_eligibility to BLOCK non-existent users
-- ============================================================================
-- Previously returned valid=true with just a warning. Now returns valid=false.
-- Added p_exclude_invitation_id parameter to support resend validation.

-- First drop the existing function to change signature
DROP FUNCTION IF EXISTS validate_invitation_eligibility(UUID, TEXT);

CREATE OR REPLACE FUNCTION validate_invitation_eligibility(
  p_inviter_id UUID,
  p_invitee_email TEXT,
  p_exclude_invitation_id UUID DEFAULT NULL  -- For resend: exclude this invitation from duplicate check
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
    -- Return early since inviter is required
    v_result := json_build_object(
      'valid', v_valid,
      'error_message', array_to_string(v_errors, '; '),
      'warning_message', '',
      'inviteeuser_id', NULL
    );
    RETURN v_result;
  END IF;

  -- Find invitee by email
  SELECT * INTO v_invitee_profile
  FROM user_profiles
  WHERE email = p_invitee_email
  LIMIT 1;

  -- SECURITY FIX: Block invitations to non-existent users
  -- Previously this was a warning, now it's an error
  IF v_invitee_profile.id IS NULL THEN
    v_errors := array_append(v_errors, 'User does not exist. Users must be created by an admin before they can be invited to a team.');
    v_valid := FALSE;
    -- Return early since other checks don't apply
    v_result := json_build_object(
      'valid', v_valid,
      'error_message', array_to_string(v_errors, '; '),
      'warning_message', array_to_string(v_warnings, '; '),
      'inviteeuser_id', NULL
    );
    RETURN v_result;
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

  -- Check for existing pending invitation (exclude current invitation for resend case)
  SELECT * INTO v_pending_invitation
  FROM hierarchy_invitations
  WHERE inviter_id = p_inviter_id
    AND invitee_email = p_invitee_email
    AND status = 'pending'
    AND expires_at > NOW()
    AND (p_exclude_invitation_id IS NULL OR id != p_exclude_invitation_id)
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
  'Validates whether an invitation can be sent. Returns valid=false if user does not exist (security fix 2026-01-02).';

-- ============================================================================
-- STEP 2: Clean up orphaned invitations
-- ============================================================================
-- Cancel all pending invitations where:
-- - invitee_id is NULL (invitation was for non-existent user)
-- - No user_profile exists with that email (user still doesn't exist)

DO $$
DECLARE
  v_cancelled_count INTEGER;
BEGIN
  UPDATE hierarchy_invitations
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE status = 'pending'
    AND invitee_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE LOWER(email) = LOWER(hierarchy_invitations.invitee_email)
    );

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  RAISE NOTICE 'Security fix: Cancelled % orphaned invitations (invitee does not exist)', v_cancelled_count;
END;
$$;

-- ============================================================================
-- STEP 3: Also cancel invitations that have invitee_id = NULL but user NOW exists
-- ============================================================================
-- These are edge cases where a user was created after the invitation was sent
-- Link them properly instead of leaving them orphaned

DO $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  -- Update invitations to link to the now-existing user
  UPDATE hierarchy_invitations hi
  SET
    invitee_id = up.id,
    updated_at = NOW()
  FROM user_profiles up
  WHERE hi.status = 'pending'
    AND hi.invitee_id IS NULL
    AND LOWER(hi.invitee_email) = LOWER(up.email);

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;

  IF v_linked_count > 0 THEN
    RAISE NOTICE 'Security fix: Linked % orphaned invitations to existing users', v_linked_count;
  END IF;
END;
$$;
