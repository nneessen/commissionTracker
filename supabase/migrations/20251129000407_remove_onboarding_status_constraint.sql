-- Remove rigid onboarding_status check constraint
-- Reason: Phase values can change over time, constraint makes it painful to update
-- onboarding_status is just a TEXT field - let the application layer handle validation

BEGIN;

-- Drop the check constraint if it exists
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_onboarding_status_check;

COMMIT;

-- Comment
COMMENT ON COLUMN public.user_profiles.onboarding_status IS 'Current onboarding phase/status. No database constraint - managed by application layer for flexibility.';
