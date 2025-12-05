-- Migration: Fix handle_new_user trigger to link existing profiles by email
-- Problem: When admin creates a user_profile (user_id=NULL), and that person later signs up,
--          the trigger creates a DUPLICATE profile instead of linking to the existing one.
-- Solution: Check for existing email first, UPDATE to link user_id if found, else INSERT.

-- Drop and recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
BEGIN
  SET LOCAL row_security = off;

  -- Check if a user_profile with this email already exists (admin-created profile)
  SELECT id INTO existing_profile_id
  FROM public.user_profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists (admin pre-created) - link the auth account to it
    UPDATE public.user_profiles
    SET
      user_id = NEW.id,
      -- If they're signing up, they should be approved (unless already set)
      approval_status = CASE
        WHEN approval_status = 'pending' AND NEW.email = 'nick@nickneessen.com' THEN 'approved'
        ELSE approval_status
      END,
      is_admin = CASE
        WHEN NEW.email = 'nick@nickneessen.com' THEN true
        ELSE is_admin
      END,
      approved_at = CASE
        WHEN NEW.email = 'nick@nickneessen.com' AND approved_at IS NULL THEN NOW()
        ELSE approved_at
      END,
      updated_at = NOW()
    WHERE id = existing_profile_id;

    RAISE NOTICE 'Linked auth user % to existing profile % for email %', NEW.id, existing_profile_id, NEW.email;
  ELSE
    -- No existing profile - create new one (original behavior)
    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      approval_status,
      is_admin,
      approved_at,
      upline_id,
      roles
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      CASE WHEN NEW.email = 'nick@nickneessen.com' THEN 'approved' ELSE 'pending' END,
      CASE WHEN NEW.email = 'nick@nickneessen.com' THEN true ELSE false END,
      CASE WHEN NEW.email = 'nick@nickneessen.com' THEN NOW() ELSE NULL END,
      NULL,
      ARRAY['agent']::text[]
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created new profile for auth user % with email %', NEW.id, NEW.email;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger function that fires when a new auth.users record is created.
If a user_profile with the same email already exists (admin-created),
it links the auth account to that profile instead of creating a duplicate.
This enables the admin "Add User" workflow where profiles are pre-created.';

-- Ensure the trigger exists (should already, but make sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
