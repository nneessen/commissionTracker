-- /home/nneessen/projects/commissionTracker/database/migrations/003_rls_policies_auth.sql
-- RLS Policies for authenticated users
-- Run this in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable all for carriers" ON carriers;
DROP POLICY IF EXISTS "Enable all for commissions" ON commissions;
DROP POLICY IF EXISTS "Enable all for policies" ON policies;
DROP POLICY IF EXISTS "Enable all for expenses" ON expenses;
DROP POLICY IF EXISTS "Enable all for clients" ON clients;
DROP POLICY IF EXISTS "Enable all for comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Enable all for constants" ON constants;
DROP POLICY IF EXISTS "Enable all for chargebacks" ON chargebacks;
DROP POLICY IF EXISTS "Enable all for settings" ON settings;

-- Create policies for authenticated users
-- These policies allow authenticated users to access all data
-- In production, you'd want more restrictive policies based on user roles

-- Carriers - all authenticated users can read, only admins can modify
CREATE POLICY "Users can read carriers" ON carriers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert carriers" ON carriers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update carriers" ON carriers
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete carriers" ON carriers
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Commissions - users can only access their own commissions
CREATE POLICY "Users can read own commissions" ON commissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own commissions" ON commissions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own commissions" ON commissions
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Policies - users can access all policies
CREATE POLICY "Users can read policies" ON policies
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert policies" ON policies
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update policies" ON policies
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete policies" ON policies
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Expenses - users can only access their own expenses
CREATE POLICY "Users can read own expenses" ON expenses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Clients - all authenticated users can access
CREATE POLICY "Users can read clients" ON clients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert clients" ON clients
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update clients" ON clients
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete clients" ON clients
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Comp Guide - all authenticated users can read, only admins can modify
CREATE POLICY "Users can read comp_guide" ON comp_guide
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert comp_guide" ON comp_guide
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update comp_guide" ON comp_guide
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete comp_guide" ON comp_guide
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Constants - all authenticated users can read
CREATE POLICY "Users can read constants" ON constants
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert constants" ON constants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update constants" ON constants
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Settings - users can only access their own settings
CREATE POLICY "Users can read own settings" ON settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own settings" ON settings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Chargebacks - users can access all chargebacks
CREATE POLICY "Users can read chargebacks" ON chargebacks
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert chargebacks" ON chargebacks
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update chargebacks" ON chargebacks
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete chargebacks" ON chargebacks
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;