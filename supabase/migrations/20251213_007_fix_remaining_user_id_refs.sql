-- Migration: Fix remaining user_id references after column removal
-- Date: 2024-12-13
-- These functions still referenced user_profiles.user_id which no longer exists

-- Fix get_user_permissions
CREATE OR REPLACE FUNCTION get_user_permissions(target_user_id uuid)
RETURNS TABLE(code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_role_names AS (
    -- Get the user's roles from user_profiles
    -- NOTE: id IS the auth user id now (no separate user_id column)
    SELECT unnest(roles) AS role_name
    FROM user_profiles
    WHERE id = target_user_id
  ),
  user_role_ids AS (
    -- Convert role names to role IDs
    SELECT r.id AS role_id
    FROM roles r
    INNER JOIN user_role_names urn ON r.name = urn.role_name
  )
  -- Get all permissions for those roles
  SELECT DISTINCT p.code
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN user_role_ids uri ON rp.role_id = uri.role_id
  ORDER BY p.code;
END;
$$;

-- Fix get_current_user_profile_id
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- id IS the auth user id now, so just return auth.uid()
  SELECT auth.uid();
$$;

-- Fix test_rls_for_user
CREATE OR REPLACE FUNCTION test_rls_for_user(test_user_id uuid)
RETURNS TABLE(policy_number text, user_id uuid, would_pass boolean)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.policy_number,
    p.user_id,
    (p.user_id = test_user_id OR p.user_id = test_user_id) as would_pass
  FROM policies p;
$$;

-- Fix log_document_changes
CREATE OR REPLACE FUNCTION log_document_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_performed_by UUID;
BEGIN
  -- id IS the auth user id now
  v_performed_by := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.user_id, v_performed_by, 'document_uploaded', jsonb_build_object(
      'document_id', NEW.id,
      'document_type', NEW.document_type,
      'document_name', NEW.document_name,
      'file_name', NEW.file_name
    ));

  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.user_id, v_performed_by, 'document_approved', jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'document_name', NEW.document_name
      ));
    ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
      INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
      VALUES (NEW.user_id, v_performed_by, 'document_rejected', jsonb_build_object(
        'document_id', NEW.id,
        'document_type', NEW.document_type,
        'document_name', NEW.document_name,
        'notes', NEW.notes
      ));
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (OLD.user_id, v_performed_by, 'document_deleted', jsonb_build_object(
      'document_id', OLD.id,
      'document_type', OLD.document_type,
      'document_name', OLD.document_name
    ));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix log_email_events
CREATE OR REPLACE FUNCTION log_email_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_performed_by UUID;
BEGIN
  -- id IS the auth user id now
  v_performed_by := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activity_log (user_id, performed_by, action_type, details)
    VALUES (NEW.user_id, v_performed_by, 'email_received', jsonb_build_object(
      'email_id', NEW.id,
      'subject', NEW.subject,
      'from_address', NEW.from_address
    ));
  END IF;

  RETURN NEW;
END;
$$;

-- Fix is_admin_user
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- id IS the auth user id now
  SELECT COALESCE(
    (SELECT is_admin FROM user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Fix has_role
CREATE OR REPLACE FUNCTION has_role(role_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- id IS the auth user id now
  SELECT COALESCE(
    (SELECT role_to_check = ANY(roles) FROM user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Add comment
COMMENT ON FUNCTION get_user_permissions(uuid) IS
'Returns permission codes for a user. Uses id column (which IS auth.users.id).';

COMMENT ON FUNCTION get_current_user_profile_id() IS
'Returns the current user profile ID, which is the same as auth.uid().';
