-- supabase/migrations/20251216_003_fix_user_emails_rls_text_columns.sql
-- Fix: RLS policies for user_emails - handle UUID columns properly
-- The columns are UUID, auth.uid() is UUID, comparisons need proper casting

-- Drop all existing user_emails policies
DROP POLICY IF EXISTS "user_emails_select_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_sent" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_sender" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_recipient" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_admin" ON user_emails;

-- ===========================================
-- SELECT POLICIES (UUID = UUID direct comparison)
-- ===========================================

CREATE POLICY "user_emails_select_own"
ON user_emails FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "user_emails_select_sent"
ON user_emails FOR SELECT
USING (sender_id = auth.uid());

CREATE POLICY "user_emails_select_recruiter"
ON user_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = user_emails.user_id
    AND up.recruiter_id = auth.uid()
  )
);

CREATE POLICY "user_emails_select_admin"
ON user_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);

-- ===========================================
-- INSERT POLICIES (UUID comparisons)
-- ===========================================

-- Users can insert emails they send (sender_id must match current user)
-- Cast sender_id to text for comparison since JS client may send text
CREATE POLICY "user_emails_insert_own"
ON user_emails FOR INSERT
WITH CHECK (
  sender_id::text = auth.uid()::text
);

-- Admins can insert emails for anyone
CREATE POLICY "user_emails_insert_admin"
ON user_emails FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);

-- ===========================================
-- UPDATE POLICIES (UUID comparisons)
-- ===========================================

CREATE POLICY "user_emails_update_sender"
ON user_emails FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "user_emails_update_recipient"
ON user_emails FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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

-- ===========================================
-- DELETE POLICIES
-- ===========================================

CREATE POLICY "user_emails_delete_own"
ON user_emails FOR DELETE
USING (user_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "user_emails_delete_admin"
ON user_emails FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);
