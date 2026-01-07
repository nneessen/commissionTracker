-- /home/nneessen/projects/commissionTracker/supabase/migrations/20260107_001_policy_number_optional_unique.sql
-- Make policy_number optional and enforce uniqueness when provided
--
-- Changes:
-- 1. Allow policy_number to be NULL (users without policy numbers)
-- 2. Add partial unique constraint (unique only when NOT NULL)

-- Step 1: Drop NOT NULL constraint on policy_number
ALTER TABLE policies ALTER COLUMN policy_number DROP NOT NULL;

-- Step 2: Create partial unique index (allows multiple NULL values while enforcing uniqueness for non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_policy_number_unique
ON policies (policy_number)
WHERE policy_number IS NOT NULL;

-- Add documentation comment
COMMENT ON COLUMN policies.policy_number IS 'Policy number from carrier. Optional - can be NULL if not yet assigned. Must be unique when provided.';
