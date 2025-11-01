-- ============================================================================
-- FIX RLS POLICIES - Dashboard showing 0s despite data existing
-- ============================================================================
-- The data exists but RLS policies are blocking access from the app
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, let's see what user is authenticated
SELECT
  'Current auth.uid():' as check_type,
  auth.uid()::text as value;

-- Check existing RLS policies on main tables
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
WHERE tablename IN ('policies', 'commissions', 'expenses', 'clients')
ORDER BY tablename, policyname;

-- Now let's verify a policy can actually see data
-- This should return your 11 policies if RLS is working
SELECT COUNT(*) as policies_visible_to_current_user
FROM policies;

-- If the above returns 0, RLS is blocking you
-- Let's check if user_id column matches auth.uid()
SELECT
  COUNT(*) as total_policies,
  COUNT(DISTINCT user_id) as distinct_user_ids,
  array_agg(DISTINCT user_id::text) as user_ids_in_policies
FROM policies;

-- ============================================================================
-- POTENTIAL FIX: Temporarily disable RLS to test
-- ============================================================================
-- ONLY RUN THIS IF YOU NEED TO DEBUG FURTHER
-- (Uncomment to use)

-- ALTER TABLE policies DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE commissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- After running above diagnostics, paste the results and I'll fix it
-- ============================================================================
