-- supabase/migrations/20251013171134_add_recurring_group_id.sql
-- Add recurring_group_id to link related recurring expenses together

-- Add recurring_group_id column to expenses table
ALTER TABLE expenses
ADD COLUMN recurring_group_id UUID;

-- Add index for faster lookups of recurring expense groups
CREATE INDEX idx_expenses_recurring_group_id ON expenses(recurring_group_id)
WHERE recurring_group_id IS NOT NULL;

-- Add optional end date for recurring expenses
ALTER TABLE expenses
ADD COLUMN recurring_end_date DATE;

-- Comment on new columns
COMMENT ON COLUMN expenses.recurring_group_id IS 'UUID linking related recurring expenses together. All expenses in the same recurring series share this ID.';
COMMENT ON COLUMN expenses.recurring_end_date IS 'Optional end date for recurring expenses. If set, no new instances will be generated after this date.';
