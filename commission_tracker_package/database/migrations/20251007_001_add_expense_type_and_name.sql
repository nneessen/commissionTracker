-- supabase/migrations/20251007_001_add_expense_type_and_name.sql
-- Add expense_type field to differentiate personal vs business expenses
-- Add name field for short expense title

-- Create expense_type enum
DO $$ BEGIN
    CREATE TYPE expense_type AS ENUM ('personal', 'business');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add expense_type column (defaults to personal for existing records)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_type expense_type NOT NULL DEFAULT 'personal';

-- Add name column (will be populated from description)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Migrate existing data: copy description to name
UPDATE expenses
SET name = LEFT(description, 255)
WHERE name IS NULL;

-- Make name required after migration
ALTER TABLE expenses
  ALTER COLUMN name SET NOT NULL;

-- Add is_deductible column (defaults to false)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_deductible BOOLEAN NOT NULL DEFAULT false;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Add helpful comments
COMMENT ON COLUMN expenses.expense_type IS 'Type of expense: personal or business';
COMMENT ON COLUMN expenses.name IS 'Short name/title of the expense';
COMMENT ON COLUMN expenses.description IS 'Detailed description of the expense';
COMMENT ON COLUMN expenses.is_deductible IS 'Whether the expense is tax deductible';
