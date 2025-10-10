-- Fix expenses RLS policies and add expense categories management
-- Migration: 20251007_002

-- ============================================================================
-- 1. Fix RLS Policies for Expenses
-- ============================================================================

-- Drop and recreate policies to ensure correct configuration
DROP POLICY IF EXISTS "Users can read own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

CREATE POLICY "Users can read own expenses" ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Create Expense Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique category names per user
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can read own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can insert own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can update own expense categories" ON expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense categories" ON expense_categories;

-- RLS Policies for expense_categories
CREATE POLICY "Users can read own expense categories" ON expense_categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense categories" ON expense_categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense categories" ON expense_categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense categories" ON expense_categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 3. Insert Default Categories for Insurance Agents
-- ============================================================================

-- Function to seed default categories for new users
CREATE OR REPLACE FUNCTION seed_default_expense_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO expense_categories (user_id, name, description, sort_order) VALUES
    (NEW.id, 'Marketing & Advertising', 'Lead generation, ads, website costs', 1),
    (NEW.id, 'Office & Administrative', 'Supplies, software subscriptions, CRM', 2),
    (NEW.id, 'Travel & Mileage', 'Client meetings, conferences, gas', 3),
    (NEW.id, 'Professional Services', 'E&O insurance, legal, accounting', 4),
    (NEW.id, 'Technology', 'Laptop, phone, software, tools', 5),
    (NEW.id, 'Meals & Entertainment', 'Client dinners, networking events', 6),
    (NEW.id, 'Licensing & Certifications', 'State licenses, CE credits', 7),
    (NEW.id, 'Phone & Internet', 'Mobile plan, internet service', 8),
    (NEW.id, 'Professional Development', 'Courses, seminars, coaching', 9),
    (NEW.id, 'Other', 'Miscellaneous business expenses', 10)
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS seed_expense_categories_trigger ON auth.users;
DROP FUNCTION IF EXISTS seed_default_expense_categories();

-- Recreate function
CREATE OR REPLACE FUNCTION seed_default_expense_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO expense_categories (user_id, name, description, sort_order) VALUES
    (NEW.id, 'Marketing & Advertising', 'Lead generation, ads, website costs', 1),
    (NEW.id, 'Office & Administrative', 'Supplies, software subscriptions, CRM', 2),
    (NEW.id, 'Travel & Mileage', 'Client meetings, conferences, gas', 3),
    (NEW.id, 'Professional Services', 'E&O insurance, legal, accounting', 4),
    (NEW.id, 'Technology', 'Laptop, phone, software, tools', 5),
    (NEW.id, 'Meals & Entertainment', 'Client dinners, networking events', 6),
    (NEW.id, 'Licensing & Certifications', 'State licenses, CE credits', 7),
    (NEW.id, 'Phone & Internet', 'Mobile plan, internet service', 8),
    (NEW.id, 'Professional Development', 'Courses, seminars, coaching', 9),
    (NEW.id, 'Other', 'Miscellaneous business expenses', 10)
  ON CONFLICT (user_id, name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER seed_expense_categories_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_expense_categories();

-- ============================================================================
-- 4. Update expenses table to reference categories (optional FK)
-- ============================================================================

-- Add comment to clarify that category is TEXT for flexibility
COMMENT ON COLUMN expenses.category IS 'Expense category name (TEXT for flexibility, can reference expense_categories.name)';

-- ============================================================================
-- 5. Seed categories for existing users
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    INSERT INTO expense_categories (user_id, name, description, sort_order) VALUES
      (user_record.id, 'Marketing & Advertising', 'Lead generation, ads, website costs', 1),
      (user_record.id, 'Office & Administrative', 'Supplies, software subscriptions, CRM', 2),
      (user_record.id, 'Travel & Mileage', 'Client meetings, conferences, gas', 3),
      (user_record.id, 'Professional Services', 'E&O insurance, legal, accounting', 4),
      (user_record.id, 'Technology', 'Laptop, phone, software, tools', 5),
      (user_record.id, 'Meals & Entertainment', 'Client dinners, networking events', 6),
      (user_record.id, 'Licensing & Certifications', 'State licenses, CE credits', 7),
      (user_record.id, 'Phone & Internet', 'Mobile plan, internet service', 8),
      (user_record.id, 'Professional Development', 'Courses, seminars, coaching', 9),
      (user_record.id, 'Other', 'Miscellaneous business expenses', 10)
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END $$;
