-- Migration: Consolidate duplicate deductible fields in expenses table
--
-- Problem: expenses table has BOTH is_deductible and is_tax_deductible fields
-- Solution: Keep is_tax_deductible (better semantic meaning), drop is_deductible
--
-- This migration is idempotent and can be run multiple times safely

BEGIN;

-- Step 1: Ensure is_tax_deductible has NOT NULL constraint and proper default
-- First, update any NULL values in is_tax_deductible by checking is_deductible
DO $$
BEGIN
  -- Only update if column exists (idempotency check)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_deductible'
  ) THEN
    -- Migrate data: If is_tax_deductible is NULL, use is_deductible value
    -- Otherwise keep existing is_tax_deductible value (prefer user-marked data)
    UPDATE expenses
    SET is_tax_deductible = COALESCE(is_tax_deductible, is_deductible, false)
    WHERE is_tax_deductible IS NULL;

    RAISE NOTICE 'Data migration from is_deductible to is_tax_deductible complete';
  END IF;
END $$;

-- Step 2: Ensure is_tax_deductible is NOT NULL with proper default
DO $$
BEGIN
  -- Set default if not already set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses'
    AND column_name = 'is_tax_deductible'
    AND column_default = 'false'
  ) THEN
    ALTER TABLE expenses
    ALTER COLUMN is_tax_deductible SET DEFAULT false;

    RAISE NOTICE 'Set default false for is_tax_deductible';
  END IF;

  -- Add NOT NULL constraint if not already present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses'
    AND column_name = 'is_tax_deductible'
    AND is_nullable = 'YES'
  ) THEN
    -- First ensure no NULL values exist
    UPDATE expenses SET is_tax_deductible = false WHERE is_tax_deductible IS NULL;

    -- Then add NOT NULL constraint
    ALTER TABLE expenses
    ALTER COLUMN is_tax_deductible SET NOT NULL;

    RAISE NOTICE 'Added NOT NULL constraint to is_tax_deductible';
  END IF;
END $$;

-- Step 3: Drop the is_deductible column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_deductible'
  ) THEN
    ALTER TABLE expenses DROP COLUMN is_deductible;
    RAISE NOTICE 'Dropped is_deductible column';
  ELSE
    RAISE NOTICE 'is_deductible column already removed, skipping';
  END IF;
END $$;

-- Step 4: Ensure index exists on is_tax_deductible (should already exist)
CREATE INDEX IF NOT EXISTS idx_expenses_is_tax_deductible
ON expenses(is_tax_deductible)
WHERE is_tax_deductible = true;

-- Step 5: Add helpful comment to the column
COMMENT ON COLUMN expenses.is_tax_deductible IS
'User-marked as potentially tax deductible. FOR PERSONAL TRACKING ONLY - not tax advice. User should consult a tax professional.';

COMMIT;

-- Verification queries (run these manually after migration to verify):
--
-- -- Check column exists and has correct constraints:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'expenses' AND column_name = 'is_tax_deductible';
--
-- -- Verify old column is gone:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'expenses' AND column_name = 'is_deductible';
-- -- Should return 0 rows
--
-- -- Check data integrity:
-- SELECT is_tax_deductible, COUNT(*) FROM expenses GROUP BY is_tax_deductible;
