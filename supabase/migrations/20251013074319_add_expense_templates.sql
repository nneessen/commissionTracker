-- Migration: Add Expense Templates
-- Date: Oct 13, 2025
-- Purpose: Allow users to save expense templates for quick one-click entry of recurring expenses

-- This solves the "recurring expense" problem by providing templates
-- User clicks template → form pre-fills → user saves
-- Much faster than re-entering same expense monthly

BEGIN;

-- Create expense_templates table
CREATE TABLE IF NOT EXISTS expense_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,

  -- Template metadata
  template_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Expense data (pre-fill values)
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  expense_type expense_type NOT NULL DEFAULT 'personal',
  is_tax_deductible BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,

  -- Frequency indicator (for display/sorting, not auto-generation)
  recurring_frequency TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT fk_expense_templates_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  -- Frequency constraint
  CONSTRAINT expense_templates_recurring_frequency_check
    CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expense_templates_user_id ON expense_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_templates_category ON expense_templates(category);
CREATE INDEX IF NOT EXISTS idx_expense_templates_frequency ON expense_templates(recurring_frequency) WHERE recurring_frequency IS NOT NULL;

-- Add RLS policies
ALTER TABLE expense_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates
CREATE POLICY expense_templates_select_own
  ON expense_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own templates
CREATE POLICY expense_templates_insert_own
  ON expense_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY expense_templates_update_own
  ON expense_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY expense_templates_delete_own
  ON expense_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_expense_templates_updated_at
  BEFORE UPDATE ON expense_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE expense_templates IS 'User-defined expense templates for quick entry of recurring expenses';
COMMENT ON COLUMN expense_templates.template_name IS 'User-friendly name for the template (e.g., "Netflix Monthly", "Office Rent")';
COMMENT ON COLUMN expense_templates.recurring_frequency IS 'How often this expense typically occurs (for display/sorting only, NOT auto-generation)';

COMMIT;

-- Note: Templates do NOT auto-generate expenses
-- They simply pre-fill the expense form for faster manual entry
-- User workflow: Click template → Form opens with values → User can edit → Save
