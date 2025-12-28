-- Migration: 20251228_002_staff_role_constraints.sql
-- Purpose: Add CHECK constraint to prevent staff roles from having onboarding_status
--
-- Business Rule: Users with trainer or contracting_manager roles should NEVER
-- have onboarding_status set because they don't go through the recruiting pipeline.

-- First, clean up any existing invalid data (set onboarding_status to NULL for staff)
UPDATE user_profiles
SET onboarding_status = NULL, updated_at = NOW()
WHERE (roles && ARRAY['trainer', 'contracting_manager']::text[])
  AND onboarding_status IS NOT NULL;

-- Add CHECK constraint to enforce the rule at database level
-- This prevents staff roles from having onboarding_status via any code path
ALTER TABLE user_profiles
ADD CONSTRAINT check_staff_no_onboarding CHECK (
  -- If user has trainer or contracting_manager role, onboarding_status must be NULL
  NOT (
    roles && ARRAY['trainer', 'contracting_manager']::text[]
    AND onboarding_status IS NOT NULL
  )
);

-- Also ensure staff roles have agent_status = 'not_applicable'
UPDATE user_profiles
SET agent_status = 'not_applicable', updated_at = NOW()
WHERE (roles && ARRAY['trainer', 'contracting_manager']::text[])
  AND agent_status != 'not_applicable';

-- Add index on roles array for faster queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN (roles);

COMMENT ON CONSTRAINT check_staff_no_onboarding ON user_profiles IS
  'Ensures staff roles (trainer, contracting_manager) cannot have onboarding_status set';
