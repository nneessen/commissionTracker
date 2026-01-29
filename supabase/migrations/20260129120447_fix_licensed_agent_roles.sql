-- supabase/migrations/20260129120447_fix_licensed_agent_roles.sql
-- Fix: Add 'recruit' role to licensed agents still in the recruiting pipeline
--
-- Problem: Licensed agents were incorrectly assigned roles = ['agent'] during creation,
-- which caused them to be excluded from pipeline views (queries require 'recruit' role).
--
-- Solution: Add 'recruit' role to licensed agents who:
--   1. Have agent_status = 'licensed'
--   2. Don't already have 'recruit' role
--   3. Haven't completed onboarding (still in pipeline)
--   4. Have a pipeline template assigned

-- Add 'recruit' role to licensed agents still in the pipeline
UPDATE user_profiles
SET
  roles = array_append(roles, 'recruit'),
  updated_at = NOW()
WHERE agent_status = 'licensed'
  AND NOT ('recruit' = ANY(roles))
  AND onboarding_completed_at IS NULL
  AND pipeline_template_id IS NOT NULL;

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % licensed agents with recruit role', updated_count;
END $$;
