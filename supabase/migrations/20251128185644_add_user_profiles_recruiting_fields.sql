-- Migration: Add missing recruiting/onboarding fields to user_profiles table
-- This migration adds all the fields needed for recruiting pipeline functionality
-- that were defined in TypeScript types but missing from the database

BEGIN;

-- Add personal information fields
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add hierarchy fields
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS upline_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hierarchy_path TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS hierarchy_depth INTEGER DEFAULT 0;

-- Add onboarding/recruiting fields
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_status TEXT,
ADD COLUMN IF NOT EXISTS current_onboarding_phase TEXT,
ADD COLUMN IF NOT EXISTS recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add social media fields
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_username TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add check constraint for onboarding_status
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_onboarding_status_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_onboarding_status_check
CHECK (onboarding_status IS NULL OR onboarding_status IN (
  'interview_1',
  'zoom_interview',
  'pre_licensing',
  'exam',
  'npn_received',
  'contracting',
  'bootcamp',
  'completed',
  'dropped'
));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status ON public.user_profiles(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_recruiter_id ON public.user_profiles(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_upline_id ON public.user_profiles(upline_id);

-- Add comment to table
COMMENT ON TABLE public.user_profiles IS 'Unified user profile table handling both active agents and recruits. Recruits have onboarding_status != null AND approval_status != approved. Active agents have approval_status = approved.';

COMMIT;

RAISE NOTICE '========================================';
RAISE NOTICE 'User Profiles Recruiting Fields Migration Complete!';
RAISE NOTICE '========================================';
RAISE NOTICE 'Added fields:';
RAISE NOTICE '  Personal: first_name, last_name, phone, profile_photo_url';
RAISE NOTICE '  Hierarchy: upline_id, hierarchy_path, hierarchy_depth';
RAISE NOTICE '  Recruiting: onboarding_status, current_onboarding_phase, recruiter_id';
RAISE NOTICE '  Timestamps: onboarding_started_at, onboarding_completed_at';
RAISE NOTICE '  Social: instagram_username/url, linkedin_username/url';
RAISE NOTICE '========================================';
