-- supabase/migrations/20260220153759_add_update_policy_with_check.sql
-- Add WITH CHECK to email_templates UPDATE policy to prevent privilege escalation.
--
-- Without WITH CHECK, a trainer editing a global template could:
--   1. Set is_global = false → orphan the template (no owner, not global, invisible)
--   2. Set created_by = their UUID → claim ownership of a system template
--
-- WITH CHECK validates the NEW row state after update:
--   - Admins: unrestricted
--   - Owners: created_by must remain their own UID
--   - IMO staff on global: must stay global with NULL created_by

ALTER POLICY email_templates_update ON public.email_templates
  USING (
    ((select auth.uid()) = created_by)
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
        AND (is_admin = true OR is_super_admin = true)
    )
    OR
    (is_global = true AND is_imo_staff_role())
  )
  WITH CHECK (
    -- Admin/super_admin: unrestricted
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
        AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Owner: created_by must remain self
    ((select auth.uid()) = created_by)
    OR
    -- IMO staff on global: must remain global with NULL owner
    (is_global = true AND created_by IS NULL AND is_imo_staff_role())
  );
