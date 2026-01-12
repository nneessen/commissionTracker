-- Migration: Fix admin policies for user_emails (column reference fix)
-- The previous migration had "up.user_id" which doesn't exist, should be "up.id"

-- Drop the failed admin policies (they didn't create due to error)
DROP POLICY IF EXISTS "user_emails_select_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_admin" ON user_emails;

-- Recreate with correct column reference (up.id = auth.uid())

-- Policy: Admins can view all emails
CREATE POLICY "user_emails_select_admin"
ON user_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);

-- Policy: Admins can insert emails for anyone
CREATE POLICY "user_emails_insert_admin"
ON user_emails FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);

-- Policy: Admins can update any email
CREATE POLICY "user_emails_update_admin"
ON user_emails FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);

-- Policy: Admins can delete emails
CREATE POLICY "user_emails_delete_admin"
ON user_emails FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);
