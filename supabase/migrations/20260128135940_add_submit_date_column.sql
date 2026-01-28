-- supabase/migrations/20260128135940_add_submit_date_column.sql
-- Add submit_date column to policies table

-- ============================================================================
-- Add submit_date column for tracking when a policy was submitted
-- This is distinct from effective_date (when coverage starts) and created_at (DB timestamp)
-- ============================================================================

ALTER TABLE policies
ADD COLUMN IF NOT EXISTS submit_date DATE;

-- Set default for existing records to effective_date (reasonable fallback)
UPDATE policies
SET submit_date = effective_date::date
WHERE submit_date IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN policies.submit_date IS
'Date the policy was submitted for processing. May differ from effective_date (when coverage begins) and created_at (record creation timestamp).';

-- Create index for date range queries on submit_date
CREATE INDEX IF NOT EXISTS idx_policies_submit_date ON policies(submit_date);
