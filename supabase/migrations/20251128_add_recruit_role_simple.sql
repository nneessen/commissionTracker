-- Migration: Add recruit role support
-- This migration adds the recruit role to the system

BEGIN;

-- Add a check to ensure roles column supports 'recruit' value
-- First drop the old constraint if it exists
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_roles_check;

-- Add new constraint that includes 'recruit' role
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_roles_check
CHECK (
  roles IS NULL OR
  roles <@ ARRAY['admin', 'agent', 'recruit', 'trainer', 'recruiter', 'upline_manager']::text[]
);

-- Update any existing users in onboarding to have recruit role
UPDATE public.user_profiles
SET roles = ARRAY['recruit']::text[]
WHERE onboarding_status IN ('lead', 'active', 'interview_1', 'zoom_interview', 'pre_licensing', 'exam', 'npn_received', 'contracting', 'bootcamp')
AND (roles IS NULL OR roles = '{}')
AND approval_status = 'pending';

COMMIT;

-- Add comment
COMMENT ON COLUMN public.user_profiles.roles IS 'User roles: recruit (in pipeline), agent (active licensed), admin (full access), trainer, recruiter, upline_manager';