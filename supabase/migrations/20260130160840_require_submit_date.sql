-- supabase/migrations/20260130160840_require_submit_date.sql
-- Make submit_date column NOT NULL to enforce data integrity
-- ============================================================================

-- Step 1: Backfill any NULL submit_date values with effective_date
-- This ensures existing data is valid before adding the constraint
UPDATE policies
SET submit_date = effective_date::date
WHERE submit_date IS NULL;

-- Step 2: Add NOT NULL constraint
-- This prevents future inserts/updates from having NULL submit_date
ALTER TABLE policies
ALTER COLUMN submit_date SET NOT NULL;

-- Step 3: Add a default value for safety
-- If an insert somehow doesn't provide submit_date, use current date
-- Note: Application should always provide this, but defense-in-depth
ALTER TABLE policies
ALTER COLUMN submit_date SET DEFAULT CURRENT_DATE;

-- Add comment documenting the change
COMMENT ON COLUMN policies.submit_date IS
'Date the policy was submitted for processing. REQUIRED field - defaults to current date if not provided. May differ from effective_date (when coverage begins) and created_at (record creation timestamp).';
