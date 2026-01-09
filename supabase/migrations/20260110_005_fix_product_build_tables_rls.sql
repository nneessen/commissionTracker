-- supabase/migrations/20260110_005_fix_product_build_tables_rls.sql
-- Fix RLS policies for product_build_tables to use user_profiles instead of agents

-- Drop incorrect policies that referenced 'agents' table (they may not exist if initial creation failed)
DROP POLICY IF EXISTS "Users can view product build tables for their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can insert product build tables for their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can update product build tables for their IMO" ON product_build_tables;
DROP POLICY IF EXISTS "Users can delete product build tables for their IMO" ON product_build_tables;

-- Policy: Users can view product build tables from their own IMO
CREATE POLICY "Users can view product build tables from their IMO"
ON product_build_tables FOR SELECT
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can insert product build tables for their own IMO
CREATE POLICY "Users can insert product build tables for their IMO"
ON product_build_tables FOR INSERT
TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can update product build tables from their own IMO
CREATE POLICY "Users can update product build tables from their IMO"
ON product_build_tables FOR UPDATE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can delete product build tables from their own IMO
CREATE POLICY "Users can delete product build tables from their IMO"
ON product_build_tables FOR DELETE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);
