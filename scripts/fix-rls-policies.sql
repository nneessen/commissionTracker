-- Fix RLS policies for carriers and products tables
-- Run this in Supabase Dashboard -> SQL Editor
--
-- This will allow anonymous users to read carriers and products (reference data)

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON carriers;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON carriers;
DROP POLICY IF EXISTS "Users can view all carriers" ON carriers;

DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;

-- Create permissive policies for reference data
CREATE POLICY "allow_public_read_carriers"
ON carriers
FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_public_read_products"
ON products
FOR SELECT
TO public
USING (is_active = true);

-- Verify RLS is enabled
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Show the new policies
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('carriers', 'products')
ORDER BY tablename, policyname;
