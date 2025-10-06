-- database/migrations/005_fix_rls_security.sql
-- Critical Security Fix: Replace overly permissive RLS policies with proper user isolation
-- ONLY for tables that have user_id column

-- =====================================================
-- COMMISSIONS TABLE - User-specific commissions
-- =====================================================
DROP POLICY IF EXISTS "Enable all for commissions" ON commissions;
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;

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
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can create own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;

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
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can create own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

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
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can create own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

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
-- SETTINGS TABLE - User-specific settings
-- =====================================================
DROP POLICY IF EXISTS "Enable all for settings" ON settings;
DROP POLICY IF EXISTS "Users can view own settings" ON settings;
DROP POLICY IF EXISTS "Users can create own settings" ON settings;
DROP POLICY IF EXISTS "Users can update own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON settings;

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
-- TABLES WITHOUT user_id - Keep permissive or public
-- These tables don't have user_id so RLS is different
-- =====================================================

-- CARRIERS: Typically shared across users, keep permissive or make public
DROP POLICY IF EXISTS "Enable all for carriers" ON carriers;
CREATE POLICY "Authenticated users can manage carriers" ON carriers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- COMP_GUIDE: Shared comp guide data, keep permissive
DROP POLICY IF EXISTS "Enable all for comp_guide" ON comp_guide;
CREATE POLICY "Authenticated users can read comp_guide" ON comp_guide
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage comp_guide" ON comp_guide
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CHARGEBACKS: If this needs user isolation, add user_id column first
-- For now, keep it accessible to authenticated users
DROP POLICY IF EXISTS "Enable all for chargebacks" ON chargebacks;
CREATE POLICY "Authenticated users can manage chargebacks" ON chargebacks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CONSTANTS: Shared constants, keep permissive
DROP POLICY IF EXISTS "Enable all for constants" ON constants;
CREATE POLICY "Authenticated users can read constants" ON constants
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage constants" ON constants
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. Tables WITH user_id (commissions, policies, expenses, clients, settings)
--    now have proper user isolation via RLS
-- 2. Tables WITHOUT user_id (carriers, comp_guide, chargebacks, constants)
--    are accessible to all authenticated users
-- 3. If you need user isolation for carriers/chargebacks/etc, add user_id column first
-- 4. Test with multiple user accounts to ensure proper isolation
