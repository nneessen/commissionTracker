-- supabase/migrations/20260105_006_revert_user_creation_fix.sql
-- REVERT: Restore original handle_new_user function
-- If the previous fix broke things, this restores the original

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
  -- REVERTED: Removed agent_status to match original behavior
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
      last_name
      -- Note: subscription_tier has DEFAULT 'free', no need to specify
      -- Note: created_at/updated_at have defaults
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
      v_last_name
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
Reverted 2025-01-05 - removed agent_status field from INSERT.';
