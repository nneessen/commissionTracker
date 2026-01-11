-- supabase/migrations/20260111_003_fix_criteria_delete_policy.sql
-- Fix RLS delete policy to include admin and super-admin roles

-- Drop and recreate all criteria policies to include admin/super-admin
DROP POLICY IF EXISTS "IMO admins can insert criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can update criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can delete criteria" ON carrier_underwriting_criteria;

-- IMO admins/owners AND regular admins can insert criteria
CREATE POLICY "Admins can insert criteria"
  ON carrier_underwriting_criteria
  FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (
        roles && ARRAY['imo_admin', 'imo_owner', 'admin', 'super-admin']
        OR is_super_admin = TRUE
      )
    )
  );

-- IMO admins/owners AND regular admins can update criteria
CREATE POLICY "Admins can update criteria"
  ON carrier_underwriting_criteria
  FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (
        roles && ARRAY['imo_admin', 'imo_owner', 'admin', 'super-admin']
        OR is_super_admin = TRUE
      )
    )
  )
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (
        roles && ARRAY['imo_admin', 'imo_owner', 'admin', 'super-admin']
        OR is_super_admin = TRUE
      )
    )
  );

-- IMO admins/owners AND regular admins can delete criteria
CREATE POLICY "Admins can delete criteria"
  ON carrier_underwriting_criteria
  FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles
      WHERE id = auth.uid()
      AND (
        roles && ARRAY['imo_admin', 'imo_owner', 'admin', 'super-admin']
        OR is_super_admin = TRUE
      )
    )
  );
