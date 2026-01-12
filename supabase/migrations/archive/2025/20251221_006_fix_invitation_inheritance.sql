-- =====================================================
-- Fix Invitation Inheritance Migration
-- =====================================================
-- When an invitation is accepted, the invitee should inherit
-- the inviter's imo_id and agency_id automatically.
--
-- Previously, only upline_id was set, leaving imo_id and
-- agency_id NULL. This broke multi-IMO functionality.
-- =====================================================

CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_imo_id UUID;
  v_inviter_agency_id UUID;
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Set responded_at timestamp
    NEW.responded_at := NOW();
    NEW.updated_at := NOW();

    -- Get inviter's imo_id and agency_id for inheritance
    SELECT imo_id, agency_id
    INTO v_inviter_imo_id, v_inviter_agency_id
    FROM user_profiles
    WHERE id = NEW.inviter_id;

    -- Update invitee's profile with upline AND inherited imo/agency
    UPDATE user_profiles
    SET
      upline_id = NEW.inviter_id,
      imo_id = COALESCE(imo_id, v_inviter_imo_id),      -- Only set if not already set
      agency_id = COALESCE(agency_id, v_inviter_agency_id), -- Only set if not already set
      approval_status = 'approved',                      -- Auto-approve on invitation accept
      approved_at = COALESCE(approved_at, NOW())
    WHERE id = NEW.invitee_id;

    RAISE NOTICE 'Invitation accepted: invitee % joined under inviter % (imo: %, agency: %)',
      NEW.invitee_id, NEW.inviter_id, v_inviter_imo_id, v_inviter_agency_id;

  -- Set responded_at for denied status
  ELSIF NEW.status = 'denied' AND OLD.status = 'pending' THEN
    NEW.responded_at := NOW();
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_invitation_accepted IS 'When an invitation is accepted, sets the invitee upline_id to the inviter AND inherits imo_id/agency_id from inviter. Also auto-approves the user.';
