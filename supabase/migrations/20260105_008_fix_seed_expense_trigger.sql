-- supabase/migrations/20260105_008_fix_seed_expense_trigger.sql
-- Fix: seed_default_expense_categories references old table name (expense_categories)
-- The table was renamed to user_expense_categories in migration 001

-- Actually, with the new architecture, we don't need to seed per-user categories anymore.
-- Global categories are in global_expense_categories table.
-- User custom categories are in user_expense_categories (empty by default).

-- Drop the trigger that's causing user creation to fail
DROP TRIGGER IF EXISTS seed_expense_categories_trigger ON auth.users;

-- Drop the function since it's no longer needed
DROP FUNCTION IF EXISTS seed_default_expense_categories();

-- Note: The global_expense_categories table already has all default categories
-- seeded by migration 20260105_001_expense_categories_redesign.sql
