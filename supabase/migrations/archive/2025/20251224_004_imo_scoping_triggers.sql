-- Migration: Enable RLS on products and add imo_id auto-population triggers
-- Purpose: Ensure multi-tenant data isolation for carriers, products, and comp_guide
--
-- This migration:
-- 1. Enables RLS on products table (was disabled)
-- 2. Creates a trigger function to auto-populate imo_id from authenticated user
-- 3. Applies the trigger to carriers, products, and comp_guide tables

-- ============================================================================
-- 1. Enable RLS on products table
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Create trigger function to auto-set imo_id from user context
-- ============================================================================
CREATE OR REPLACE FUNCTION set_imo_id_from_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_imo_id uuid;
BEGIN
  -- Only set imo_id if it's not already provided
  IF NEW.imo_id IS NULL THEN
    -- Get the current user's imo_id from their profile
    SELECT imo_id INTO v_user_imo_id
    FROM user_profiles
    WHERE id = auth.uid();

    -- Set the imo_id on the new record
    NEW.imo_id := v_user_imo_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION set_imo_id_from_user() IS
  'Automatically sets imo_id from the authenticated user''s profile when inserting records.
   This ensures multi-tenant data isolation at the database level.';

-- ============================================================================
-- 3. Apply triggers to carriers, products, and comp_guide
-- ============================================================================

-- Carriers trigger
DROP TRIGGER IF EXISTS set_carrier_imo_id ON carriers;
CREATE TRIGGER set_carrier_imo_id
  BEFORE INSERT ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION set_imo_id_from_user();

-- Products trigger
DROP TRIGGER IF EXISTS set_product_imo_id ON products;
CREATE TRIGGER set_product_imo_id
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_imo_id_from_user();

-- Comp guide trigger
DROP TRIGGER IF EXISTS set_comp_guide_imo_id ON comp_guide;
CREATE TRIGGER set_comp_guide_imo_id
  BEFORE INSERT ON comp_guide
  FOR EACH ROW
  EXECUTE FUNCTION set_imo_id_from_user();

-- ============================================================================
-- 4. Verify RLS is enabled on all three tables
-- ============================================================================
DO $$
DECLARE
  v_carriers_rls boolean;
  v_products_rls boolean;
  v_comp_guide_rls boolean;
BEGIN
  SELECT relrowsecurity INTO v_carriers_rls
  FROM pg_class WHERE relname = 'carriers';

  SELECT relrowsecurity INTO v_products_rls
  FROM pg_class WHERE relname = 'products';

  SELECT relrowsecurity INTO v_comp_guide_rls
  FROM pg_class WHERE relname = 'comp_guide';

  IF NOT v_carriers_rls OR NOT v_products_rls OR NOT v_comp_guide_rls THEN
    RAISE EXCEPTION 'RLS not enabled on all tables. carriers=%, products=%, comp_guide=%',
      v_carriers_rls, v_products_rls, v_comp_guide_rls;
  END IF;

  RAISE NOTICE 'RLS verified: carriers=%, products=%, comp_guide=%',
    v_carriers_rls, v_products_rls, v_comp_guide_rls;
END $$;
