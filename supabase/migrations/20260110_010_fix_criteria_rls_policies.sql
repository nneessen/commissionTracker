-- supabase/migrations/20260110_010_fix_criteria_rls_policies.sql
-- Fix RLS policies to use 'roles' array instead of 'role' column

-- Drop the failed policies (if they exist, they may have partially failed)
DROP POLICY IF EXISTS "IMO admins can insert criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can update criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can delete criteria" ON carrier_underwriting_criteria;

-- Recreate policies with correct column reference (roles is an array)

-- IMO admins and owners can insert new criteria
CREATE POLICY "IMO admins can insert criteria"
  ON carrier_underwriting_criteria
  FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (roles && ARRAY['imo_admin', 'imo_owner'])
    )
  );

-- IMO admins and owners can update criteria
CREATE POLICY "IMO admins can update criteria"
  ON carrier_underwriting_criteria
  FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (roles && ARRAY['imo_admin', 'imo_owner'])
    )
  )
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (roles && ARRAY['imo_admin', 'imo_owner'])
    )
  );

-- IMO admins and owners can delete criteria
CREATE POLICY "IMO admins can delete criteria"
  ON carrier_underwriting_criteria
  FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (roles && ARRAY['imo_admin', 'imo_owner'])
    )
  );
