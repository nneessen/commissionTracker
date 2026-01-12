-- supabase/migrations/20251216_002_fix_user_emails_rls_correct_types.sql
-- Migration: Fix user_emails RLS policies - remove type casts, columns are UUID
-- Previous migration partially failed, this cleans up and recreates correctly

-- Drop all existing user_emails policies (cleanup from partial migration)
DROP POLICY IF EXISTS "user_emails_select_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_sent" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_select_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_recruiter" ON user_emails;
DROP POLICY IF EXISTS "user_emails_insert_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_sender" ON user_emails;
DROP POLICY IF EXISTS "user_emails_update_admin" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_own" ON user_emails;
DROP POLICY IF EXISTS "user_emails_delete_admin" ON user_emails;

-- ===========================================
-- SELECT POLICIES (no type cast - columns are UUID)
-- ===========================================

-- Policy 1: Users can view emails where they are the recipient (user_id)
CREATE POLICY "user_emails_select_own"
ON user_emails FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Users can view emails they sent (sender_id)
CREATE POLICY "user_emails_select_sent"
ON user_emails FOR SELECT
USING (auth.uid() = sender_id);

-- Policy 3: Recruiters can view emails for their recruits
CREATE POLICY "user_emails_select_recruiter"
ON user_emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = user_emails.user_id
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
-- INSERT POLICIES (no type cast - columns are UUID)
-- ===========================================

-- Policy 5: Users can insert emails they send
-- Note: sender_id must be set to auth.uid() for this to work
CREATE POLICY "user_emails_insert_own"
ON user_emails FOR INSERT
WITH CHECK (
  -- Sender must be the current user
  sender_id = auth.uid()
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
-- UPDATE POLICIES (no type cast - columns are UUID)
-- ===========================================

-- Policy 7: Senders can update their own sent emails
CREATE POLICY "user_emails_update_sender"
ON user_emails FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Policy 8: Recipients can update emails (mark as read)
CREATE POLICY "user_emails_update_recipient"
ON user_emails FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 9: Admins can update any email
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

-- Policy 10: Users can delete their own sent emails
CREATE POLICY "user_emails_delete_own"
ON user_emails FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = sender_id);

-- Policy 11: Admins can delete any emails
CREATE POLICY "user_emails_delete_admin"
ON user_emails FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.is_admin = true
  )
);
