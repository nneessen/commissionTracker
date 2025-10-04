-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251004_fix_carriers_products_rls.sql
--
-- Fix RLS policies for carriers and products tables to allow anonymous read access
--
-- Problem: RLS policies were filtering all data for anonymous users (auth.uid() = NULL)
-- Solution: Allow public SELECT access to reference data (carriers and products)
--
-- Reference: plans/ACTIVE/20251003_ACTIVE_fix_products_dropdown_DIAGNOSED.md

-- Step 1: Check existing policies
DO $$
BEGIN
  RAISE NOTICE 'Existing RLS policies:';
END $$;

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('carriers', 'products')
ORDER BY tablename, policyname;

-- Step 2: Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON carriers;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON carriers;
DROP POLICY IF EXISTS "Users can view all carriers" ON carriers;

DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;

-- Step 3: Create permissive policies for reference data
-- Carriers: Allow everyone to read (reference data)
CREATE POLICY "allow_public_read_carriers"
ON carriers
FOR SELECT
TO public
USING (true);

-- Products: Allow everyone to read active products only
CREATE POLICY "allow_public_read_products"
ON products
FOR SELECT
TO public
USING (is_active = true);

-- Step 4: Verify RLS is enabled (should already be enabled)
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the new policies
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('carriers', 'products')
ORDER BY tablename, policyname;

-- Expected result:
-- carriers | allow_public_read_carriers | {public} | SELECT | true
-- products | allow_public_read_products | {public} | SELECT | (is_active = true)
