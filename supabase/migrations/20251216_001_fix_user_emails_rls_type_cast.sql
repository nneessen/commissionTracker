-- supabase/migrations/20251216_001_fix_user_emails_rls_type_cast.sql
-- Migration: Fix user_emails RLS policies - UUID to TEXT type casting
-- Issue: auth.uid() returns UUID but sender_id/user_id columns are TEXT
-- Error: "operator does not exist: uuid = text"

-- Drop all existing user_emails policies
DROP POLICY IF EXISTS "user_emails_select_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_sent" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_sender" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_admin" ON user_emails;

-- ===========================================
-- SELECT POLICIES (with UUID to TEXT cast)
-- ===========================================

-- Policy 1: Users can view emails where they are the recipient (user_id)
CREATE POLICY "user_emails_select_own"
ON user_emails FOR SELECT
USING (auth.uid()::text = user_id);

-- Policy 2: Users can view emails they sent (sender_id)
CREATE POLICY "user_emails_select_sent"
ON user_emails FOR SELECT
USING (auth.uid()::text = sender_id);

-- Policy 3: Recruiters can view emails for their recruits
CREATE POLICY "user_emails_select_recruiter"
ON user_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id::text = user_emails.user_id
    AND up.recruiter_id = auth.uid()
  )
);

-- Policy 4: Admins can view all emails
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
-- INSERT POLICIES (with UUID to TEXT cast)
-- ===========================================

-- Policy 5: Users can insert emails for recruits they manage
CREATE POLICY "user_emails_insert_recruiter"
ON user_emails FOR INSERT
WITH CHECK (
  -- Sender must be the current user
  sender_id = auth.uid()::text
  AND (
    -- Either sending to themselves
    user_id = auth.uid()::text
    OR
    -- Or to a recruit they manage
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id::text = user_emails.user_id
      AND up.recruiter_id = auth.uid()
    )
  )
);

-- Policy 6: Admins can insert emails for anyone
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
-- UPDATE POLICIES (with UUID to TEXT cast)
-- ===========================================

-- Policy 7: Senders can update their own sent emails
CREATE POLICY "user_emails_update_sender"
ON user_emails FOR UPDATE
USING (auth.uid()::text = sender_id)
WITH CHECK (auth.uid()::text = sender_id);

-- Policy 8: Admins can update any email
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

-- Policy 9: Users can delete their own emails
CREATE POLICY "user_emails_delete_own"
ON user_emails FOR DELETE
USING (auth.uid()::text = user_id OR auth.uid()::text = sender_id);

-- Policy 10: Admins can delete any emails
CREATE POLICY "user_emails_delete_admin"
ON user_emails FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);
