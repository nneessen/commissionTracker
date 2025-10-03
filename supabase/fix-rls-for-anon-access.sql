-- /home/nneessen/projects/commissionTracker/supabase/fix-rls-for-anon-access.sql
-- Fix RLS policies to allow anonymous users to read carriers and products
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Create New Query
-- 3. Copy/paste this entire file
-- 4. Click RUN
-- 5. Run: node scripts/diagnose-rls-issue.js to verify

-- ============================================================================
-- DIAGNOSTIC: Check current RLS status and policies
-- ============================================================================

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('carriers', 'products');

-- Check existing policies (if any)
SELECT
  schemaname,
  tablename,
  policyname as "Policy Name",
  roles as "Roles",
  cmd as "Command",
  qual as "USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('carriers', 'products');

-- ============================================================================
-- SOLUTION: Choose ONE option below
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ OPTION 1: Disable RLS (Fastest, Recommended for MVP)                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Uncomment these lines to disable RLS entirely:
-- ALTER TABLE public.carriers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ OPTION 2: Create Permissive Policies (More Secure)                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Uncomment these lines to keep RLS but allow anonymous access:

-- Drop any existing restrictive policies
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.carriers;
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
-- DROP POLICY IF EXISTS "carriers_read_policy" ON public.carriers;
-- DROP POLICY IF EXISTS "products_read_policy" ON public.products;

-- Enable RLS
-- ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create new permissive policies for anonymous access
-- CREATE POLICY "allow_anon_read_carriers"
--   ON public.carriers
--   FOR SELECT
--   TO public
--   USING (true);

-- CREATE POLICY "allow_anon_read_products"
--   ON public.products
--   FOR SELECT
--   TO public
--   USING (is_active = true);

-- ============================================================================
-- VERIFICATION: Check that fix was applied
-- ============================================================================

-- Check RLS status after fix
SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('carriers', 'products');

-- Check policies after fix
SELECT
  tablename,
  policyname as "Policy Name",
  roles as "Roles",
  qual as "USING Expression"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('carriers', 'products');

-- Count data (should show 7 carriers, 42 products)
SELECT
  'carriers' as table_name,
  COUNT(*) as row_count
FROM public.carriers
UNION ALL
SELECT
  'products' as table_name,
  COUNT(*) as row_count
FROM public.products;

-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS SQL:
-- ============================================================================
-- 1. Run: node scripts/diagnose-rls-issue.js
--    → Should show "✅ SUCCESS: 7 carriers found" and "✅ SUCCESS: 42 products found"
--
-- 2. Start dev server: npm run dev
--
-- 3. Open browser: http://localhost:3002
--
-- 4. Test policy form:
--    - Click "New Policy"
--    - Select carrier: "United Home Life"
--    - Products dropdown should populate with 7 products
--    - Select product: "Term"
--    - Commission should auto-fill: 102.5%
-- ============================================================================
