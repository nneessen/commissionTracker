-- Add ALL missing fields needed for AddRecruitDialog form
-- This adds fields that were not included in the previous migration

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS personal_website TEXT,
  ADD COLUMN IF NOT EXISTS resident_state TEXT;

COMMENT ON COLUMN public.user_profiles.personal_website IS 'Personal website URL';
COMMENT ON COLUMN public.user_profiles.resident_state IS 'Primary state of residence for licensing';
