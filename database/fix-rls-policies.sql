-- /home/nneessen/projects/commissionTracker/database/fix-rls-policies.sql
-- Fix RLS policies for development
-- WARNING: These are permissive policies for development.
-- In production, you should implement proper authentication and user-specific policies.

-- First, check if RLS is enabled and what policies exist
-- Run this to see current state:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Disable RLS temporarily (if you want no security for development)
-- Uncomment these lines if you want to completely disable RLS:
-- ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE commissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE policies DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comp_guide DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE constants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents DISABLE ROW LEVEL SECURITY;

-- OR: Create permissive policies for development (recommended approach)
-- This allows all operations while RLS is still enabled

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Enable all for carriers" ON carriers;
DROP POLICY IF EXISTS "Enable read for carriers" ON carriers;
DROP POLICY IF EXISTS "Enable insert for carriers" ON carriers;
DROP POLICY IF EXISTS "Enable update for carriers" ON carriers;
DROP POLICY IF EXISTS "Enable delete for carriers" ON carriers;

-- Create new permissive policies for carriers
CREATE POLICY "Enable all for carriers" ON carriers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Repeat for other tables that are giving you issues
DROP POLICY IF EXISTS "Enable all for commissions" ON commissions;
CREATE POLICY "Enable all for commissions" ON commissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for policies" ON policies;
CREATE POLICY "Enable all for policies" ON policies
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for expenses" ON expenses;
CREATE POLICY "Enable all for expenses" ON expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for clients" ON clients;
CREATE POLICY "Enable all for clients" ON clients
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for comp_guide" ON comp_guide;
CREATE POLICY "Enable all for comp_guide" ON comp_guide
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for constants" ON constants;
CREATE POLICY "Enable all for constants" ON constants
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for agents" ON agents;
CREATE POLICY "Enable all for agents" ON agents
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for chargebacks" ON chargebacks;
CREATE POLICY "Enable all for chargebacks" ON chargebacks
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for settings" ON settings;
CREATE POLICY "Enable all for settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify the policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;