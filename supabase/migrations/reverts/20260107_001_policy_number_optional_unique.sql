-- /home/nneessen/projects/commissionTracker/supabase/migrations/reverts/20260107_001_policy_number_optional_unique.sql
-- Revert: Make policy_number required again and remove unique constraint

-- Step 1: Drop the partial unique index
DROP INDEX IF EXISTS idx_policies_policy_number_unique;

-- Step 2: Update any NULL policy_numbers to empty string before adding NOT NULL
-- WARNING: This may fail if there are NULL values - manual intervention required
UPDATE policies SET policy_number = '' WHERE policy_number IS NULL;

-- Step 3: Re-add NOT NULL constraint
ALTER TABLE policies ALTER COLUMN policy_number SET NOT NULL;

-- Remove documentation comment
COMMENT ON COLUMN policies.policy_number IS NULL;
