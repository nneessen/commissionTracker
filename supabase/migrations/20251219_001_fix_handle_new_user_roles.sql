-- supabase/migrations/20251219_001_fix_handle_new_user_roles.sql
--
-- FIX: The handle_new_user trigger was always setting roles to ['agent'],
-- ignoring the roles passed in user_metadata. This caused:
-- 1. Recruits created via admin panel to appear as agents
-- 2. Role-based access control to fail for recruits
--
-- This migration updates the trigger to:
-- 1. Read roles from user_metadata if present
-- 2. Fall back to ['agent'] only if no roles specified

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
BEGIN
  SET LOCAL row_security = off;

  -- Extract roles from user metadata, defaulting to ['agent'] if not provided
  -- The edge function passes roles in raw_user_meta_data->'roles' as a JSON array
  v_roles := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles')),
    ARRAY['agent']::text[]
  );

  -- If roles array is empty, default to agent
  IF array_length(v_roles, 1) IS NULL OR array_length(v_roles, 1) = 0 THEN
    v_roles := ARRAY['agent']::text[];
  END IF;

  -- Create profile with id = auth.users.id (they are the same!)
  INSERT INTO user_profiles (
    id,
    email,
    approval_status,
    is_admin,
    approved_at,
    upline_id,
    roles
  )
  VALUES (
    NEW.id,  -- Profile ID = Auth User ID
    NEW.email,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved' ELSE 'pending' END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN NOW() ELSE NULL END,
    NULL,
    v_roles
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated profile for auth user % (ID: %) with roles: %', NEW.email, NEW.id, v_roles;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile when new auth user is created. Respects roles from user_metadata, defaults to agent if none provided.';

-- ============================================================================
-- FUNCTION: Link pending invitations to newly registered users
-- ============================================================================
-- When a new user registers, update any pending hierarchy_invitations
-- that match their email to include their new user_id as invitee_id

CREATE OR REPLACE FUNCTION link_pending_invitations_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link any pending invitations sent to this email
  UPDATE hierarchy_invitations
  SET
    invitee_id = NEW.id,
    updated_at = NOW()
  WHERE invitee_email = LOWER(NEW.email)
    AND invitee_id IS NULL
    AND status = 'pending';

  RAISE NOTICE 'Linked pending invitations for newly registered user: %', NEW.email;

  RETURN NEW;
END;
$$;

-- Create trigger on user_profiles (fires after profile is created)
DROP TRIGGER IF EXISTS trigger_link_invitations_on_registration ON user_profiles;

CREATE TRIGGER trigger_link_invitations_on_registration
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_pending_invitations_on_registration();

COMMENT ON FUNCTION link_pending_invitations_on_registration IS
  'Automatically links pending hierarchy invitations to newly registered users';

COMMENT ON TRIGGER trigger_link_invitations_on_registration ON user_profiles IS
  'Links invitations by email when a new user registers';
