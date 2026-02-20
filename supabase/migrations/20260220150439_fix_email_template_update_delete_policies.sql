-- supabase/migrations/20260220150439_fix_email_template_update_delete_policies.sql
-- Fix: UPDATE and DELETE policies on email_templates block global template operations.
--
-- UPDATE policy only had auth.uid() = created_by — fails for global templates (created_by IS NULL).
-- DELETE policy only had admin/super_admin override — trainers/contracting_managers were blocked
-- despite the UI showing edit/delete buttons for those roles.
--
-- Fix: Both policies now allow:
--   1. Owner can update/delete own templates (auth.uid() = created_by)
--   2. Admin/super_admin can update/delete ANY template
--   3. IMO staff (trainer, contracting_manager) can update/delete GLOBAL templates

-- Fix UPDATE policy
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
  );

-- Fix DELETE policy (was only admin/super_admin, now also includes imo_staff for global)
ALTER POLICY email_templates_delete ON public.email_templates
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
  );
