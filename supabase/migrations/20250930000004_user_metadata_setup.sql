-- /home/nneessen/projects/commissionTracker/database/migrations/004_user_metadata_setup.sql
-- Setup user metadata functionality
-- Run this in Supabase SQL Editor

-- Create a function to update user metadata
-- This allows users to update their profile information
CREATE OR REPLACE FUNCTION public.update_user_metadata(
    user_id UUID,
    metadata JSONB
)
RETURNS void AS $$
BEGIN
    -- Only allow users to update their own metadata
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'You can only update your own metadata';
    END IF;

    UPDATE auth.users
    SET
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || metadata,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user profile with metadata
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    phone TEXT,
    contract_comp_level INTEGER,
    is_active BOOLEAN,
    agent_code TEXT,
    license_number TEXT,
    license_state TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email::TEXT,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email)::TEXT as name,
        (u.raw_user_meta_data->>'phone')::TEXT as phone,
        COALESCE((u.raw_user_meta_data->>'contract_comp_level')::INTEGER, 100) as contract_comp_level,
        COALESCE((u.raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
        (u.raw_user_meta_data->>'agent_code')::TEXT as agent_code,
        (u.raw_user_meta_data->>'license_number')::TEXT as license_number,
        (u.raw_user_meta_data->>'license_state')::TEXT as license_state,
        (u.raw_user_meta_data->>'notes')::TEXT as notes,
        u.created_at,
        u.updated_at
    FROM auth.users u
    WHERE u.id = user_id
    AND (u.id = auth.uid() OR auth.uid() IS NOT NULL); -- Users can see their own profile
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_metadata TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile TO authenticated;

-- Add a trigger to set default metadata on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Set default metadata for new users
    NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) ||
        jsonb_build_object(
            'contract_comp_level', 100,
            'is_active', true,
            'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
            BEFORE INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;