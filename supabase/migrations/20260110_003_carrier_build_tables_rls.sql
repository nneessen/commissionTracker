-- supabase/migrations/20260110_003_carrier_build_tables_rls.sql
-- RLS policies for carrier_build_tables

-- Drop incorrect policies if they exist
DROP POLICY IF EXISTS "Users can view build tables for their IMO" ON carrier_build_tables;
DROP POLICY IF EXISTS "Users can insert build tables for their IMO" ON carrier_build_tables;
DROP POLICY IF EXISTS "Users can update build tables for their IMO" ON carrier_build_tables;
DROP POLICY IF EXISTS "Users can delete build tables for their IMO" ON carrier_build_tables;

-- Policy: Users can view build tables from their own IMO
CREATE POLICY "Users can view build tables from their IMO"
ON carrier_build_tables FOR SELECT
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can insert build tables for their own IMO
CREATE POLICY "Users can insert build tables for their IMO"
ON carrier_build_tables FOR INSERT
TO authenticated
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can update build tables from their own IMO
CREATE POLICY "Users can update build tables from their IMO"
ON carrier_build_tables FOR UPDATE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
)
WITH CHECK (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);

-- Policy: Users can delete build tables from their own IMO
CREATE POLICY "Users can delete build tables from their IMO"
ON carrier_build_tables FOR DELETE
TO authenticated
USING (
  imo_id = (SELECT imo_id FROM user_profiles WHERE id = auth.uid())
);
