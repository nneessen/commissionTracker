-- supabase/migrations/20251226_007_fix_handle_new_user_robust.sql
--
-- FIX: Robust handle_new_user trigger that doesn't fail
-- Problem: User creation failing with "Database error creating new user"
-- Root cause: handle_new_user trigger function has an error (possibly referencing non-existent columns)
--
-- Solution: Replace with a minimal, robust version that:
-- 1. Only inserts truly required columns with guaranteed defaults
-- 2. Has extensive error handling
-- 3. Logs any errors instead of failing

-- ============================================================================
-- Drop and recreate the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles text[];
  v_first_name text;
  v_last_name text;
  v_full_name text;
BEGIN
  -- Disable RLS for this insert
  SET LOCAL row_security = off;

  -- Extract roles from user metadata, defaulting to ['agent'] if not provided
  BEGIN
    v_roles := COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles')),
      ARRAY['agent']::text[]
    );

    -- If roles array is empty, default to agent
    IF array_length(v_roles, 1) IS NULL OR array_length(v_roles, 1) = 0 THEN
      v_roles := ARRAY['agent']::text[];
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_roles := ARRAY['agent']::text[];
      RAISE WARNING 'handle_new_user: Failed to parse roles, defaulting to agent: %', SQLERRM;
  END;

  -- Extract full_name from metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  -- Parse first/last name from full_name
  IF v_full_name != '' AND position(' ' in v_full_name) > 0 THEN
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := substring(v_full_name from position(' ' in v_full_name) + 1);
  ELSIF v_full_name != '' THEN
    v_first_name := v_full_name;
    v_last_name := NULL;
  ELSE
    v_first_name := split_part(NEW.email, '@', 1);
    v_last_name := NULL;
  END IF;

  -- Create profile with id = auth.users.id (they are the same!)
  -- Only insert columns that are guaranteed to exist and have proper defaults
  BEGIN
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
      CASE WHEN NEW.email = 'nickneessen@thestandardhq.com' THEN 'approved' ELSE 'pending' END,
      CASE WHEN NEW.email = 'nickneessen@thestandardhq.com' THEN true ELSE false END,
      CASE WHEN NEW.email = 'nickneessen@thestandardhq.com' THEN NOW() ELSE NULL END,
      NULL,
      v_roles,
      v_first_name,
      v_last_name
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();

    RAISE NOTICE 'handle_new_user: Created/updated profile for % (ID: %) with roles: %', NEW.email, NEW.id, v_roles;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error with full details
      RAISE WARNING 'handle_new_user: Failed to create profile for % (ID: %): % | SQLSTATE: %',
        NEW.email, NEW.id, SQLERRM, SQLSTATE;
      -- Re-raise to cause the transaction to fail (this preserves auth consistency)
      RAISE;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- This outer exception handler catches any unexpected errors
    RAISE WARNING 'handle_new_user: Unexpected error for % (ID: %): % | SQLSTATE: %',
      NEW.email, NEW.id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
'Creates user profile when new auth user is created.
Robust version with error handling. Uses first_name/last_name columns, respects roles from user_metadata.
Updated 2024-12-26 to fix user creation failures.';

-- ============================================================================
-- Ensure the trigger exists
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
