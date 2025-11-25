-- Migration: Add Invitation Validation Functions
-- Purpose: Create server-side validation functions for invitation system
-- Created: 2025-11-25
--
-- ADDS:
--   - Function to validate if email exists in auth.users
--   - Function to check if user can receive invitation
--   - Proper SECURITY DEFINER to access auth schema

BEGIN;

-- ============================================
-- 1. FUNCTION TO CHECK IF EMAIL EXISTS
-- ============================================

CREATE OR REPLACE FUNCTION public.check_email_exists(target_email TEXT)
RETURNS TABLE(
  email_exists BOOLEAN,
  user_id UUID,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Look up user by email in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(target_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email address is not registered in the system'::TEXT;
  ELSE
    RETURN QUERY SELECT true, v_user_id, NULL::TEXT;
  END IF;
END;
$$;

-- ============================================
-- 2. FUNCTION TO VALIDATE INVITATION ELIGIBILITY
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_invitation_eligibility(
  p_inviter_id UUID,
  p_invitee_email TEXT
)
RETURNS TABLE(
  valid BOOLEAN,
  invitee_user_id UUID,
  error_message TEXT,
  warning_message TEXT
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitee_id UUID;
  v_inviter_path TEXT;
  v_invitee_profile RECORD;
  v_existing_invitation RECORD;
BEGIN
  -- Check 1: Email must exist in auth.users
  SELECT user_id INTO v_invitee_id
  FROM public.check_email_exists(p_invitee_email);

  IF v_invitee_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      'Email address is not registered in the system'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check 2: Cannot invite yourself
  IF v_invitee_id = p_inviter_id THEN
    RETURN QUERY SELECT
      false,
      v_invitee_id,
      'Cannot invite yourself'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Get inviter's hierarchy path
  SELECT hierarchy_path INTO v_inviter_path
  FROM public.user_profiles
  WHERE id = p_inviter_id;

  IF v_inviter_path IS NULL THEN
    RETURN QUERY SELECT
      false,
      v_invitee_id,
      'Inviter profile not found'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Get invitee profile
  SELECT * INTO v_invitee_profile
  FROM public.user_profiles
  WHERE id = v_invitee_id;

  IF v_invitee_profile.id IS NULL THEN
    RETURN QUERY SELECT
      false,
      v_invitee_id,
      'Target user profile not found'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check 3: Target cannot already have upline_id
  IF v_invitee_profile.upline_id IS NOT NULL THEN
    RETURN QUERY SELECT
      false,
      v_invitee_id,
      'User is already in a hierarchy'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check 4: Target cannot be in inviter's upline chain (circular reference)
  IF v_inviter_path LIKE '%' || v_invitee_id::TEXT || '%' THEN
    RETURN QUERY SELECT
      false,
      v_invitee_id,
      'Cannot invite someone in your upline chain'::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Check 5: Target must not have pending invitation from anyone
  SELECT * INTO v_existing_invitation
  FROM public.hierarchy_invitations
  WHERE invitee_id = v_invitee_id
    AND status = 'pending';

  IF v_existing_invitation.id IS NOT NULL THEN
    IF v_existing_invitation.inviter_id = p_inviter_id THEN
      RETURN QUERY SELECT
        false,
        v_invitee_id,
        'You already have a pending invitation to this user'::TEXT,
        NULL::TEXT;
    ELSE
      RETURN QUERY SELECT
        false,
        v_invitee_id,
        'User already has a pending invitation from another agent'::TEXT,
        NULL::TEXT;
    END IF;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    true,
    v_invitee_id,
    NULL::TEXT,
    NULL::TEXT;
END;
$$;

-- ============================================
-- 3. FUNCTION TO VALIDATE INVITATION ACCEPTANCE
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_invitation_acceptance(
  p_invitee_id UUID,
  p_invitation_id UUID
)
RETURNS TABLE(
  valid BOOLEAN,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation RECORD;
  v_invitee_profile RECORD;
  v_downline_count INTEGER;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.hierarchy_invitations
  WHERE id = p_invitation_id;

  IF v_invitation.id IS NULL THEN
    RETURN QUERY SELECT false, 'Invitation not found'::TEXT;
    RETURN;
  END IF;

  -- Check: Invitation must belong to user
  IF v_invitation.invitee_id != p_invitee_id THEN
    RETURN QUERY SELECT false, 'Invitation does not belong to you'::TEXT;
    RETURN;
  END IF;

  -- Check: Invitation must be pending
  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Invitation has already been processed'::TEXT;
    RETURN;
  END IF;

  -- Check: Invitation must not be expired
  IF v_invitation.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Get invitee profile
  SELECT * INTO v_invitee_profile
  FROM public.user_profiles
  WHERE id = p_invitee_id;

  IF v_invitee_profile.id IS NULL THEN
    RETURN QUERY SELECT false, 'Your profile not found'::TEXT;
    RETURN;
  END IF;

  -- Check: Must not already have upline_id
  IF v_invitee_profile.upline_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'You are already in a hierarchy'::TEXT;
    RETURN;
  END IF;

  -- Check: Must not have any downlines
  SELECT COUNT(*) INTO v_downline_count
  FROM public.user_profiles
  WHERE upline_id = p_invitee_id;

  IF v_downline_count > 0 THEN
    RETURN QUERY SELECT false, 'Cannot accept invitation if you have existing downlines'::TEXT;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- ============================================
-- 4. GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_eligibility(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation_acceptance(UUID, UUID) TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'check_email_exists',
      'validate_invitation_eligibility',
      'validate_invitation_acceptance'
    );

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Invitation Validation Functions Created!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Functions created: %', func_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  - check_email_exists(email)';
  RAISE NOTICE '  - validate_invitation_eligibility(inviter_id, email)';
  RAISE NOTICE '  - validate_invitation_acceptance(invitee_id, invitation_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions are SECURITY DEFINER for auth schema access';
  RAISE NOTICE '===========================================';
END $$;
