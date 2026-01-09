-- Revert migration for product_build_tables
-- Run this migration to undo changes from:
--   20260110_004_product_build_tables.sql
--   20260110_005_fix_product_build_tables_rls.sql

-- WARNING: This will delete all product-level build table data!
-- Only run this if you need to revert the feature.

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view product build tables from their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can insert product build tables for their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can update product build tables from their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can delete product build tables from their IMO" ON product_build_tables;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS trigger_product_build_tables_updated_at ON product_build_tables;
DROP FUNCTION IF EXISTS update_product_build_tables_updated_at();

-- Drop the product_build_tables table
DROP TABLE IF EXISTS product_build_tables;

-- Remove the columns added to carrier_build_tables
ALTER TABLE carrier_build_tables DROP COLUMN IF EXISTS table_type;
ALTER TABLE carrier_build_tables DROP COLUMN IF EXISTS bmi_data;
