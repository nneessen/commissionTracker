-- supabase/migrations/20260106_010_fix_system_templates_rls.sql
-- Fix RLS policy to allow viewing system templates (user_id IS NULL)

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS instagram_templates_select_personal ON instagram_message_templates;

-- Create new SELECT policy that includes system templates
CREATE POLICY instagram_templates_select_personal ON instagram_message_templates
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Note: UPDATE and DELETE policies remain unchanged (user_id = auth.uid())
-- This prevents users from modifying system templates
