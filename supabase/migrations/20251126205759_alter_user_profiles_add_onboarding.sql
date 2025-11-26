-- supabase/migrations/20251126205759_alter_user_profiles_add_onboarding.sql
-- Add onboarding tracking columns to user_profiles table
-- Refactor: Recruits are agents at different lifecycle stages, not separate entities

-- Add onboarding status and tracking columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'active'
  CHECK (onboarding_status IN ('lead', 'active', 'completed', 'dropped')),
ADD COLUMN IF NOT EXISTS current_onboarding_phase TEXT,
ADD COLUMN IF NOT EXISTS recruiter_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_username TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add CHECK constraint to prevent self-recruitment
ALTER TABLE user_profiles
ADD CONSTRAINT check_no_self_recruitment
  CHECK (recruiter_id IS NULL OR recruiter_id != id);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status
  ON user_profiles(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_user_profiles_recruiter_id
  ON user_profiles(recruiter_id)
  WHERE recruiter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_current_onboarding_phase
  ON user_profiles(current_onboarding_phase)
  WHERE current_onboarding_phase IS NOT NULL;

-- Add comment explaining design decision
COMMENT ON COLUMN user_profiles.onboarding_status IS
  'Lifecycle stage: lead (new recruit), active (in onboarding), completed (finished onboarding), dropped (did not complete). Existing agents default to active.';

COMMENT ON COLUMN user_profiles.recruiter_id IS
  'Who recruited this person. Different from upline_id (who manages them). Can be same person but conceptually different relationships.';

-- Update existing records to have sensible defaults (existing users are already active agents)
-- NULL values for onboarding tracking fields are fine - they represent non-recruits

/*
-- ROLLBACK (if needed):
DROP INDEX IF EXISTS idx_user_profiles_current_onboarding_phase;
DROP INDEX IF EXISTS idx_user_profiles_recruiter_id;
DROP INDEX IF EXISTS idx_user_profiles_onboarding_status;

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS check_no_self_recruitment;

ALTER TABLE user_profiles
DROP COLUMN IF EXISTS linkedin_url,
DROP COLUMN IF EXISTS linkedin_username,
DROP COLUMN IF EXISTS instagram_url,
DROP COLUMN IF EXISTS instagram_username,
DROP COLUMN IF EXISTS referral_source,
DROP COLUMN IF EXISTS onboarding_completed_at,
DROP COLUMN IF EXISTS onboarding_started_at,
DROP COLUMN IF EXISTS recruiter_id,
DROP COLUMN IF EXISTS current_onboarding_phase,
DROP COLUMN IF EXISTS onboarding_status;
*/
