-- Migration: Fix RLS policies for proper IMO-scoped data isolation
-- Purpose: Remove overly permissive policies that defeat IMO filtering
--
-- Problem: Multiple SELECT policies exist that are too broad:
--   - "Authenticated users can view products" allows ALL authenticated users to see ALL products
--   - "Allow public read products" allows viewing all active products
--   - These defeat the IMO-scoped "Users can view products in own IMO" policy
--
-- Solution: Remove broad policies, keep only IMO-scoped policies + super admin access

-- ============================================================================
-- 1. Fix PRODUCTS table policies
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
DROP POLICY IF EXISTS "Allow public read products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Approved users can manage products" ON products;

-- The following policies remain (already correct):
--   - "Users can view products in own IMO" (SELECT)
--   - "IMO admins can manage products in own IMO" (ALL)
--   - "Super admins can manage all products" (ALL)

-- ============================================================================
-- 2. Fix CARRIERS table policies
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow public read carriers" ON carriers;
DROP POLICY IF EXISTS "Approved users can manage carriers" ON carriers;

-- The following policies remain (already correct):
--   - "Users can view carriers in own IMO" (SELECT)
--   - "IMO admins can manage carriers in own IMO" (ALL)
--   - "Super admins can manage all carriers" (ALL)

-- ============================================================================
-- 3. Fix COMP_GUIDE table policies
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Approved users can read comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "Approved users can manage comp_guide" ON comp_guide;
DROP POLICY IF EXISTS "comp_guide_public_read" ON comp_guide;

-- The following policies remain (already correct):
--   - "Users can view comp_guide in own IMO" (SELECT)
--   - "IMO admins can manage comp_guide in own IMO" (ALL)
--   - "Super admins can manage all comp_guide" (ALL)

-- ============================================================================
-- 4. Verify final policy state
-- ============================================================================

DO $$
DECLARE
  v_products_policies text[];
  v_carriers_policies text[];
  v_comp_guide_policies text[];
BEGIN
  -- Get remaining policies for each table
  SELECT array_agg(policyname ORDER BY policyname) INTO v_products_policies
  FROM pg_policies WHERE tablename = 'products';

  SELECT array_agg(policyname ORDER BY policyname) INTO v_carriers_policies
  FROM pg_policies WHERE tablename = 'carriers';

  SELECT array_agg(policyname ORDER BY policyname) INTO v_comp_guide_policies
  FROM pg_policies WHERE tablename = 'comp_guide';

  RAISE NOTICE 'Products policies: %', v_products_policies;
  RAISE NOTICE 'Carriers policies: %', v_carriers_policies;
  RAISE NOTICE 'Comp_guide policies: %', v_comp_guide_policies;
END $$;
