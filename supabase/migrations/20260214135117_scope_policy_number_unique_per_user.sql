-- Scope policy_number unique constraint to per-user instead of global
-- Different agents can legitimately have the same policy number from different carriers.
-- The global unique constraint was causing false "policy number already exists" errors
-- when upline users (who can see downline policies via RLS) had overlapping numbers.

-- Drop the global unique index
DROP INDEX IF EXISTS idx_policies_policy_number_unique;

-- Create a per-user unique index (same policy number allowed for different users)
CREATE UNIQUE INDEX idx_policies_policy_number_unique
  ON policies (policy_number, user_id)
  WHERE policy_number IS NOT NULL;
