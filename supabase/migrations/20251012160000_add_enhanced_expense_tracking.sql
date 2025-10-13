-- Migration: Add Enhanced Expense Tracking
-- Date: Oct 12, 2025
-- Purpose: Add recurring expense tracking (with frequency) and tax deductible tracking

-- This migration adds proper recurring expense tracking with frequency enumeration
-- and tax deductible tracking with appropriate disclaimers in the UI.
-- No auto-generation of expenses - user manually creates each entry.

BEGIN;

-- Add recurring expense tracking with frequency
-- Only add columns if they don't exist to make this idempotent
DO $$
BEGIN
    -- Add is_recurring column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expenses' AND column_name = 'is_recurring') THEN
        ALTER TABLE expenses ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add recurring_frequency column with constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expenses' AND column_name = 'recurring_frequency') THEN
        ALTER TABLE expenses ADD COLUMN recurring_frequency TEXT;
        ALTER TABLE expenses ADD CONSTRAINT expenses_recurring_frequency_check
            CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually'));
    END IF;

    -- Add is_tax_deductible column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expenses' AND column_name = 'is_tax_deductible') THEN
        ALTER TABLE expenses ADD COLUMN is_tax_deductible BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing data: set is_recurring to false where NULL (idempotent)
UPDATE expenses SET is_recurring = FALSE WHERE is_recurring IS NULL;

-- Update existing data: set is_tax_deductible to false where NULL (idempotent)
UPDATE expenses SET is_tax_deductible = FALSE WHERE is_tax_deductible IS NULL;

-- Add indexes for filtering performance (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_expenses_is_recurring ON expenses(is_recurring) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_is_tax_deductible ON expenses(is_tax_deductible) WHERE is_tax_deductible = TRUE;
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_frequency ON expenses(recurring_frequency) WHERE recurring_frequency IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN expenses.is_recurring IS 'Whether this is a recurring expense (e.g., monthly subscription)';
COMMENT ON COLUMN expenses.recurring_frequency IS 'How often this expense recurs: daily, weekly, biweekly, monthly, quarterly, semiannually, annually. Only meaningful if is_recurring=true.';
COMMENT ON COLUMN expenses.is_tax_deductible IS 'User-marked as potentially tax deductible. FOR PERSONAL TRACKING ONLY - not tax advice. User should consult a tax professional.';

COMMIT;

-- Note: This migration is idempotent and can be run multiple times safely.
-- Fields added:
--   - is_recurring: BOOLEAN DEFAULT FALSE
--   - recurring_frequency: TEXT with CHECK constraint
--   - is_tax_deductible: BOOLEAN DEFAULT FALSE
--
-- Design decisions:
--   1. Recurring tracking does NOT auto-generate future expenses
--   2. User manually creates each expense entry when it occurs
--   3. Frequency is for reporting/budgeting purposes only
--   4. Tax deductible is user-controlled with disclaimer in UI
--   5. No end dates - if recurring stops, user stops creating entries
