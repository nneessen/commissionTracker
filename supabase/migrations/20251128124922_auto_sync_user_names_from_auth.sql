-- Migration: Auto-sync user names from auth.users metadata to user_profiles
-- Problem: When users sign up, their names from auth metadata don't get copied to user_profiles
-- Solution: Create trigger to auto-populate first_name/last_name from auth.users metadata

BEGIN;

-- Function to sync names from auth.users metadata when user_profiles is inserted/updated
CREATE OR REPLACE FUNCTION sync_user_names_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_full_name TEXT;
    auth_first_name TEXT;
    auth_last_name TEXT;
BEGIN
    -- Get name data from auth.users metadata
    SELECT 
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'first_name',
        raw_user_meta_data->>'last_name'
    INTO 
        auth_full_name,
        auth_first_name,
        auth_last_name
    FROM auth.users
    WHERE email = NEW.email;

    -- If user_profiles first_name/last_name are NULL, populate from auth metadata
    IF NEW.first_name IS NULL AND auth_first_name IS NOT NULL THEN
        NEW.first_name := auth_first_name;
    END IF;

    IF NEW.last_name IS NULL AND auth_last_name IS NOT NULL THEN
        NEW.last_name := auth_last_name;
    END IF;

    -- If still NULL, try to parse from full_name
    IF NEW.first_name IS NULL AND auth_full_name IS NOT NULL THEN
        NEW.first_name := split_part(auth_full_name, ' ', 1);
        
        -- If full_name has multiple parts, use second part as last_name
        IF array_length(string_to_array(auth_full_name, ' '), 1) > 1 THEN
            NEW.last_name := split_part(auth_full_name, ' ', 2);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_user_names_trigger ON user_profiles;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER sync_user_names_trigger
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_names_from_auth();

COMMIT;

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Auto-sync user names trigger created';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Trigger: sync_user_names_trigger';
    RAISE NOTICE 'Function: sync_user_names_from_auth()';
    RAISE NOTICE '';
    RAISE NOTICE 'Names from auth.users will now automatically';
    RAISE NOTICE 'populate user_profiles on INSERT/UPDATE';
    RAISE NOTICE '===========================================';
END $$;
