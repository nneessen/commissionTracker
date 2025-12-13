-- supabase/migrations/20241213_010_fix_user_profile_trigger.sql

-- Drop existing trigger if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile when a new auth user is created
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    roles,
    is_active,
    is_admin,
    is_deleted,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'roles')),
      ARRAY['active_agent']::text[]
    ),
    true,
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users without profiles
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  roles,
  is_active,
  is_admin,
  is_deleted,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(au.raw_user_meta_data->'roles')),
    ARRAY['active_agent']::text[]
  ),
  true,
  COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false),
  false,
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update Supabase auth settings for email confirmation
-- Note: This needs to be done in Supabase dashboard, but we can set metadata
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile when new auth user signs up';