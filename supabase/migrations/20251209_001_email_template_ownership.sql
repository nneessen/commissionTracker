-- Migration: Email Template Ownership Model
-- 1. Add email_template_limit to settings table
-- 2. Update RLS policies for email_templates to support:
--    - Global templates visible to all authenticated users
--    - Personal templates only visible to owner
--    - Admins/trainers/contracting_managers can create global templates
--    - Any user can create personal templates (up to limit)

-- Add email template limit to settings
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS email_template_limit integer DEFAULT 10;

COMMENT ON COLUMN settings.email_template_limit IS 'Maximum number of personal email templates a user can create (premium feature)';

-- Drop existing email_templates policies
DROP POLICY IF EXISTS "Admins can manage templates" ON email_templates;
DROP POLICY IF EXISTS "email_templates_select" ON email_templates;
DROP POLICY IF EXISTS "email_templates_insert" ON email_templates;
DROP POLICY IF EXISTS "email_templates_update" ON email_templates;
DROP POLICY IF EXISTS "email_templates_delete" ON email_templates;

-- SELECT: Users see global templates + their own personal templates
CREATE POLICY "email_templates_select" ON email_templates
FOR SELECT USING (
  is_global = true
  OR created_by = auth.uid()
);

-- INSERT: Admins/trainers/contracting_managers can create global templates
-- Any authenticated user can create personal templates
CREATE POLICY "email_templates_insert" ON email_templates
FOR INSERT WITH CHECK (
  CASE
    WHEN is_global = true THEN
      -- Only admins, trainers, contracting_managers can create global templates
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE roles && ARRAY['admin'::text, 'trainer'::text, 'contracting_manager'::text]
      )
    ELSE
      -- Personal templates: must be own user and not null
      created_by = auth.uid() AND created_by IS NOT NULL
  END
);

-- UPDATE: Admins/trainers/contracting_managers can update global templates
-- Users can only update their own personal templates
CREATE POLICY "email_templates_update" ON email_templates
FOR UPDATE USING (
  CASE
    WHEN is_global = true THEN
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE roles && ARRAY['admin'::text, 'trainer'::text, 'contracting_manager'::text]
      )
    ELSE
      created_by = auth.uid()
  END
);

-- DELETE: Same as update - admins manage global, users manage their own
CREATE POLICY "email_templates_delete" ON email_templates
FOR DELETE USING (
  CASE
    WHEN is_global = true THEN
      auth.uid() IN (
        SELECT user_id FROM user_profiles
        WHERE roles && ARRAY['admin'::text, 'trainer'::text, 'contracting_manager'::text]
      )
    ELSE
      created_by = auth.uid()
  END
);

-- Create function to check user's template limit
CREATE OR REPLACE FUNCTION check_user_template_limit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count integer;
  user_limit integer;
BEGIN
  -- Get user's limit from settings (default 10 if no setting)
  SELECT COALESCE(email_template_limit, 10)
  INTO user_limit
  FROM settings
  WHERE user_id = user_uuid;

  -- If no settings row, use default of 10
  IF user_limit IS NULL THEN
    user_limit := 10;
  END IF;

  -- Count user's personal templates
  SELECT COUNT(*)
  INTO current_count
  FROM email_templates
  WHERE created_by = user_uuid AND is_global = false;

  RETURN current_count < user_limit;
END;
$$;

COMMENT ON FUNCTION check_user_template_limit IS 'Check if user is under their personal email template limit';
