-- Add missing fields to user_profiles table for recruit form
-- These fields are needed for the AddRecruitDialog form

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS npn TEXT,
  ADD COLUMN IF NOT EXISTS license_expiration DATE,
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT;

COMMENT ON COLUMN public.user_profiles.street_address IS 'Recruit street address';
COMMENT ON COLUMN public.user_profiles.city IS 'Recruit city';
COMMENT ON COLUMN public.user_profiles.state IS 'Recruit state';
COMMENT ON COLUMN public.user_profiles.zip IS 'Recruit ZIP code';
COMMENT ON COLUMN public.user_profiles.date_of_birth IS 'Recruit date of birth';
COMMENT ON COLUMN public.user_profiles.license_number IS 'Insurance license number';
COMMENT ON COLUMN public.user_profiles.npn IS 'National Producer Number';
COMMENT ON COLUMN public.user_profiles.license_expiration IS 'License expiration date';
COMMENT ON COLUMN public.user_profiles.facebook_handle IS 'Facebook handle/username';
