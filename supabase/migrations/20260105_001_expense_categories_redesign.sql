-- Migration: Expense Categories Architecture Redesign
-- Fixes the design flaw where every user gets duplicate copies of all default categories
-- Creates global system categories + user custom categories separation
-- CRITICAL: Preserves all existing expense data

-- ============================================================================
-- 1. Create global_expense_categories table (system-wide defaults)
-- ============================================================================

CREATE TABLE IF NOT EXISTS global_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  description text,
  category_type varchar(20) NOT NULL DEFAULT 'business', -- 'business', 'personal', 'general'
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_global_expense_categories_sort
  ON global_expense_categories(sort_order, name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_global_expense_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_global_expense_categories_updated_at ON global_expense_categories;
CREATE TRIGGER trigger_global_expense_categories_updated_at
  BEFORE UPDATE ON global_expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_global_expense_categories_updated_at();

-- ============================================================================
-- 2. Seed global categories with all defaults + new "Life Insurance Leads"
-- ============================================================================

INSERT INTO global_expense_categories (name, description, category_type, sort_order) VALUES
  -- Business Categories
  ('Office Supplies', 'Pens, paper, printer ink, etc.', 'business', 0),
  ('Travel', 'Transportation, hotels, flights', 'business', 1),
  ('Meals & Entertainment', 'Business meals, client entertainment', 'business', 2),
  ('Utilities', 'Electricity, water, internet, phone', 'business', 3),
  ('Insurance', 'Business insurance (health, liability, property)', 'business', 4),
  ('Marketing', 'Advertising, promotional materials', 'business', 5),
  ('Professional Services', 'Legal, accounting, consulting', 'business', 6),
  ('Technology', 'Software subscriptions, hardware', 'business', 7),
  ('Rent & Lease', 'Office space, equipment leases', 'business', 8),
  ('Training & Education', 'Courses, conferences, books', 'business', 9),
  ('Vehicle', 'Gas, maintenance, registration (business use)', 'business', 10),
  ('Life Insurance Leads', 'Lead packs purchased from vendors for client prospecting', 'business', 11),

  -- Personal Categories
  ('Credit Card Bill', 'Credit card monthly payments', 'personal', 100),
  ('Mortgage/Rent', 'Home mortgage or rent payments', 'personal', 101),
  ('Groceries', 'Food and household supplies', 'personal', 102),
  ('Car Payment', 'Auto loan or lease payments', 'personal', 103),
  ('Healthcare', 'Medical, dental, prescriptions', 'personal', 104),
  ('Entertainment', 'Movies, concerts, hobbies', 'personal', 105),
  ('Childcare', 'Daycare, babysitting, after-school programs', 'personal', 106),

  -- General/Other Categories
  ('Other', 'Miscellaneous expenses', 'general', 200),
  ('Taxes', 'Tax payments and related expenses', 'general', 201),
  ('Donations', 'Charitable contributions', 'general', 202)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. RLS Policies for global_expense_categories (read-only for all authenticated)
-- ============================================================================

ALTER TABLE global_expense_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read global categories
CREATE POLICY "Anyone can read global expense categories"
  ON global_expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify global categories
CREATE POLICY "Super admins can manage global expense categories"
  ON global_expense_categories FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- 4. Rename expense_categories to user_expense_categories
-- ============================================================================

-- First drop any dependent views/functions if they exist
DROP FUNCTION IF EXISTS get_user_expense_categories(uuid);

-- Rename the table
ALTER TABLE IF EXISTS expense_categories RENAME TO user_expense_categories;

-- Rename the foreign key constraint
ALTER TABLE user_expense_categories
  DROP CONSTRAINT IF EXISTS expense_categories_user_id_fkey;

ALTER TABLE user_expense_categories
  ADD CONSTRAINT user_expense_categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rename indexes
ALTER INDEX IF EXISTS expense_categories_pkey RENAME TO user_expense_categories_pkey;

-- Add unique constraint per user (user can't have duplicate custom category names)
ALTER TABLE user_expense_categories
  DROP CONSTRAINT IF EXISTS user_expense_categories_user_name_unique;

ALTER TABLE user_expense_categories
  ADD CONSTRAINT user_expense_categories_user_name_unique
  UNIQUE (user_id, name);

-- ============================================================================
-- 5. Clean up: Remove rows from user_expense_categories that match global categories
-- These were duplicates created by initializeDefaults() - no longer needed
-- ============================================================================

DELETE FROM user_expense_categories
WHERE name IN (SELECT name FROM global_expense_categories);

-- ============================================================================
-- 6. Update RLS policies on user_expense_categories
-- ============================================================================

-- Drop old policies with old table name
DROP POLICY IF EXISTS "Users can view own expense categories" ON user_expense_categories;
DROP POLICY IF EXISTS "Users can create own expense categories" ON user_expense_categories;
DROP POLICY IF EXISTS "Users can update own expense categories" ON user_expense_categories;
DROP POLICY IF EXISTS "Users can delete own expense categories" ON user_expense_categories;

-- Recreate policies
CREATE POLICY "Users can view own expense categories"
  ON user_expense_categories FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own expense categories"
  ON user_expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expense categories"
  ON user_expense_categories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own expense categories"
  ON user_expense_categories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. Create helper function to get all categories (global + user custom)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_expense_categories()
RETURNS TABLE (
  id uuid,
  name varchar(100),
  description text,
  category_type varchar(20),
  sort_order integer,
  is_active boolean,
  is_global boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Global categories
  SELECT
    g.id,
    g.name,
    g.description,
    g.category_type,
    g.sort_order,
    g.is_active,
    true as is_global
  FROM global_expense_categories g
  WHERE g.is_active = true

  UNION ALL

  -- User custom categories (with higher sort_order to appear after globals)
  SELECT
    u.id,
    u.name::varchar(100),
    u.description,
    'custom'::varchar(20) as category_type,
    u.sort_order + 1000 as sort_order, -- Offset to appear after global
    u.is_active,
    false as is_global
  FROM user_expense_categories u
  WHERE u.user_id = auth.uid()
    AND u.is_active = true
    AND u.name NOT IN (SELECT name FROM global_expense_categories) -- Exclude any remaining duplicates

  ORDER BY sort_order, name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_expense_categories() TO authenticated;

-- ============================================================================
-- 8. Comments
-- ============================================================================

COMMENT ON TABLE global_expense_categories IS
'System-wide expense categories available to all users. Read-only for non-admins.';

COMMENT ON TABLE user_expense_categories IS
'User-created custom expense categories. Each user can add their own categories beyond the global defaults.';

COMMENT ON FUNCTION get_all_expense_categories() IS
'Returns combined list of global + user custom categories, ordered by sort_order.';

-- ============================================================================
-- VERIFICATION QUERY (run manually to confirm data preservation)
-- ============================================================================
-- SELECT
--   (SELECT COUNT(*) FROM expenses) as expense_count,
--   (SELECT COUNT(*) FROM global_expense_categories) as global_category_count,
--   (SELECT COUNT(*) FROM user_expense_categories) as user_category_count;
