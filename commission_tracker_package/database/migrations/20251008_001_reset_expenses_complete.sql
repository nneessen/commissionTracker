-- supabase/migrations/20251008_001_reset_expenses_complete.sql
-- Complete reset and redesign of expenses feature with personal/business tracking

-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TYPE IF EXISTS expense_type CASCADE;

-- Create expense_type enum
CREATE TYPE expense_type AS ENUM ('personal', 'business');

-- Create expense_categories table for user-defined categories
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create expenses table with all required fields
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  category VARCHAR(100) NOT NULL,
  expense_type expense_type NOT NULL,
  date DATE NOT NULL,

  -- Additional fields
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency VARCHAR(20) CHECK (
    recurring_frequency IS NULL OR
    recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')
  ),
  receipt_url TEXT,
  is_deductible BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_is_deductible ON expenses(is_deductible);
CREATE INDEX idx_expense_categories_user_id ON expense_categories(user_id);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for expense_categories
CREATE POLICY "Users can view their own expense categories" ON expense_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense categories" ON expense_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories" ON expense_categories
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories" ON expense_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories for new users
-- This will be done in the application when a user first accesses expenses
-- Categories like: office, travel, meals, supplies, utilities, insurance, etc.

-- Add helpful comments
COMMENT ON TABLE expenses IS 'Tracks personal and business expenses with tax deductibility';
COMMENT ON COLUMN expenses.expense_type IS 'Type of expense: personal or business';
COMMENT ON COLUMN expenses.name IS 'Short name/title of the expense';
COMMENT ON COLUMN expenses.description IS 'Detailed description of the expense';
COMMENT ON COLUMN expenses.is_deductible IS 'Whether the expense is tax deductible';
COMMENT ON COLUMN expenses.receipt_url IS 'URL to receipt image or document';
COMMENT ON TABLE expense_categories IS 'User-defined expense categories';