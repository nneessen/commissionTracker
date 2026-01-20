-- supabase/migrations/20260120180120_landing_page_imo_admin_rls.sql
-- Add RLS policy for IMO admins to manage their landing page settings
-- FIX: Original migration only allowed super_admin write access, causing all saves to fail

-- Policy: IMO admins can manage their own IMO's landing page settings
-- Uses existing is_imo_admin() helper function for consistency
CREATE POLICY "landing_page_settings_imo_admin_all"
  ON landing_page_settings
  FOR ALL
  USING (
    is_imo_admin() AND imo_id = get_my_imo_id()
  )
  WITH CHECK (
    is_imo_admin() AND imo_id = get_my_imo_id()
  );

-- Add comment explaining the policy
COMMENT ON POLICY "landing_page_settings_imo_admin_all" ON landing_page_settings
  IS 'Allows IMO admins full CRUD access to their own IMO landing page settings';
