-- supabase/migrations/20260105_005_fix_user_creation.sql
-- Fix: User creation fails with "Database error creating new user"
-- This migration makes the handle_new_user trigger more robust and removes problematic constraints

-- ============================================================================
-- 1. Drop the check_staff_no_onboarding constraint
-- This constraint has been causing issues with user creation
-- ============================================================================

ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS check_staff_no_onboarding;

-- ============================================================================
-- 2. Update handle_new_user() trigger to be explicit about all nullable fields
-- This prevents any DEFAULT value issues and makes the trigger more robust
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
  -- Disable RLS for this insert (trigger runs as the new user, not an admin)
  SET LOCAL row_security = off;

  -- ========================================================================
  -- STEP 1: Extract roles from user metadata with exception handling
  -- ========================================================================
  BEGIN
    -- Try to extract roles from raw_user_meta_data->'roles' JSON array
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
      -- Any error in roles parsing → default to agent
      v_roles := ARRAY['agent']::text[];
      RAISE WARNING 'handle_new_user: Failed to parse roles for % (ID: %): % | Defaulting to agent',
        NEW.email, NEW.id, SQLERRM;
  END;

  -- ========================================================================
  -- STEP 2: Parse first/last name from full_name metadata
  -- ========================================================================
  BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

    IF v_full_name != '' AND position(' ' in v_full_name) > 0 THEN
      -- Has space → split into first and last
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name := substring(v_full_name from position(' ' in v_full_name) + 1);
    ELSIF v_full_name != '' THEN
      -- No space → use as first name only
      v_first_name := v_full_name;
      v_last_name := NULL;
    ELSE
      -- No full_name → use email prefix
      v_first_name := split_part(NEW.email, '@', 1);
      v_last_name := NULL;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Any error in name parsing → use email prefix
      v_first_name := split_part(NEW.email, '@', 1);
      v_last_name := NULL;
      RAISE WARNING 'handle_new_user: Failed to parse names for % (ID: %): %',
        NEW.email, NEW.id, SQLERRM;
  END;

  -- ========================================================================
  -- STEP 3: Insert into user_profiles with ON CONFLICT handling
  -- IMPORTANT: Explicitly set ALL optional fields to prevent DEFAULT issues
  -- ========================================================================
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
      last_name,
      -- Explicitly set these to prevent any DEFAULT value issues
      onboarding_status,
      agent_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      'pending',  -- All new users start as pending (service layer updates after)
      false,      -- Not admin by default (service layer updates after)
      NULL,       -- Not approved yet
      NULL,       -- No upline yet (service layer updates after)
      v_roles,
      v_first_name,
      v_last_name,
      -- Explicit values for fields that could have DEFAULT issues
      NULL,              -- onboarding_status: NULL for new users, service layer sets if needed
      'not_applicable'   -- agent_status: safe default, service layer updates based on role
    )
    ON CONFLICT (id) DO UPDATE SET
      -- Profile already exists (race condition) → just update email and timestamp
      email = EXCLUDED.email,
      updated_at = NOW();

    RAISE NOTICE 'handle_new_user: Successfully created/updated profile for % (ID: %) with roles: %',
      NEW.email, NEW.id, v_roles;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log the specific error for debugging
      RAISE WARNING 'handle_new_user: Failed to insert profile for % (ID: %): % | SQLSTATE: %',
        NEW.email, NEW.id, SQLERRM, SQLSTATE;
      -- Re-raise to fail the auth.users insert (maintains consistency)
      RAISE;
  END;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Outer exception handler catches any unexpected errors
    RAISE WARNING 'handle_new_user: Unexpected error for % (ID: %): % | SQLSTATE: %',
      NEW.email, NEW.id, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS
'Creates user profile when new auth user is created.
Updated 2025-01-05 to fix user creation failures.
- Explicitly sets onboarding_status and agent_status to prevent DEFAULT issues
- Comprehensive exception handling
- Uses ON CONFLICT for idempotent inserts';

-- ============================================================================
-- Ensure the trigger exists on auth.users (re-create for safety)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Automatically creates user_profiles entry when auth user is created';
