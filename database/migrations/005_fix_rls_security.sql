-- database/migrations/005_fix_rls_security.sql
-- Critical Security Fix: Replace overly permissive RLS policies with proper user isolation
-- This migration fixes the security vulnerability where all tables use USING(true)

-- =====================================================
-- CARRIERS TABLE - User-specific carriers
-- =====================================================
DROP POLICY IF EXISTS "Enable all for carriers" ON carriers;

CREATE POLICY "Users can view own carriers" ON carriers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own carriers" ON carriers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carriers" ON carriers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own carriers" ON carriers
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMMISSIONS TABLE - User-specific commissions
-- =====================================================
DROP POLICY IF EXISTS "Enable all for commissions" ON commissions;

CREATE POLICY "Users can view own commissions" ON commissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commissions" ON commissions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own commissions" ON commissions
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES TABLE - User-specific policies
-- =====================================================
DROP POLICY IF EXISTS "Enable all for policies" ON policies;

CREATE POLICY "Users can view own policies" ON policies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own policies" ON policies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own policies" ON policies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own policies" ON policies
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- EXPENSES TABLE - User-specific expenses
-- =====================================================
DROP POLICY IF EXISTS "Enable all for expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CLIENTS TABLE - User-specific clients
-- =====================================================
DROP POLICY IF EXISTS "Enable all for clients" ON clients;

CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own clients" ON clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMP_GUIDE TABLE - User-specific comp guides
-- =====================================================
DROP POLICY IF EXISTS "Enable all for comp_guide" ON comp_guide;

CREATE POLICY "Users can view own comp_guide entries" ON comp_guide
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comp_guide entries" ON comp_guide
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comp_guide entries" ON comp_guide
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comp_guide entries" ON comp_guide
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CHARGEBACKS TABLE - User-specific chargebacks
-- =====================================================
DROP POLICY IF EXISTS "Enable all for chargebacks" ON chargebacks;

CREATE POLICY "Users can view own chargebacks" ON chargebacks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chargebacks" ON chargebacks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chargebacks" ON chargebacks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chargebacks" ON chargebacks
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CONSTANTS TABLE - User-specific constants
-- =====================================================
DROP POLICY IF EXISTS "Enable all for constants" ON constants;

CREATE POLICY "Users can view own constants" ON constants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own constants" ON constants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own constants" ON constants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own constants" ON constants
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SETTINGS TABLE - User-specific settings
-- =====================================================
DROP POLICY IF EXISTS "Enable all for settings" ON settings;

CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- AGENTS TABLE (deprecated - but secure it anyway)
-- =====================================================
DROP POLICY IF EXISTS "Enable all for agents" ON agents;

-- Agents table is deprecated but if it exists, secure it
-- Check if agents table exists before applying policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    EXECUTE 'CREATE POLICY "Users can view own agents" ON agents FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can create own agents" ON agents FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update own agents" ON agents FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete own agents" ON agents FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END
$$;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. This migration assumes all tables have a user_id column that references auth.users(id)
-- 2. If any tables don't have user_id, they need to be migrated first
-- 3. After applying this migration, test with multiple user accounts to ensure proper isolation
-- 4. Monitor for any access issues and adjust policies as needed
-- 5. Consider adding indexes on user_id columns for performance