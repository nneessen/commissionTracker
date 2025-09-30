-- /home/nneessen/projects/commissionTracker/database/quick-fix-rls.sql
-- Quick fix for RLS issues - Run this in Supabase SQL Editor
-- This will allow all operations without authentication for development

-- Option 1: DISABLE RLS (Quickest fix for development)
-- This completely disables row level security
ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
ALTER TABLE commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE comp_guide DISABLE ROW LEVEL SECURITY;
ALTER TABLE constants DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE chargebacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;