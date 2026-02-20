-- supabase/migrations/20260220142000_fix_email_template_delete_policy.sql
-- Fix: email_templates DELETE policy silently fails for global templates (created_by IS NULL)
-- because NULL comparison always returns false. Also allow admins/super_admins to delete any template.

ALTER POLICY email_templates_delete ON public.email_templates
  USING (
    ((select auth.uid()) = created_by)
    OR
    (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
        AND (is_admin = true OR is_super_admin = true)
    ))
  );
