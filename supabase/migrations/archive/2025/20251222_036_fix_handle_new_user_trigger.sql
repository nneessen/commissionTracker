-- supabase/migrations/20251222_036_fix_handle_new_user_trigger.sql
--
-- FIX: The handle_new_user trigger was referencing non-existent columns
-- (is_active, is_deleted, full_name) which caused "Database error creating new user"
-- when the Supabase Auth API tried to create users.
--
-- This migration updates the trigger to use the correct schema:
-- - first_name and last_name instead of full_name
-- - No is_active or is_deleted columns (removed in earlier migration)
-- - Proper SET search_path for security
-- - SET LOCAL row_security = off to bypass RLS during insert

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
    roles,
    first_name,
    last_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved' ELSE 'pending' END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN true ELSE false END,
    CASE WHEN NEW.email = 'nick@nickneessen.com' THEN NOW() ELSE NULL END,
    NULL,
    v_roles,
    COALESCE(
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      split_part(NEW.email, '@', 1)
    ),
    CASE
      WHEN position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', '')) > 0
      THEN substring(NEW.raw_user_meta_data->>'full_name' from position(' ' in NEW.raw_user_meta_data->>'full_name') + 1)
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RAISE NOTICE 'Created/updated profile for auth user % (ID: %) with roles: %', NEW.email, NEW.id, v_roles;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS 'Creates user profile when new auth user is created. Uses first_name/last_name columns, respects roles from user_metadata.';
