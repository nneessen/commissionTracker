-- Migration: Fix user_emails RLS policies
-- Issue: Recruiters cannot view emails for their recruits due to broken policy
-- The existing policy has a convoluted subquery that doesn't work correctly

-- Drop existing broken policies
DROP POLICY IF EXISTS "Recruiters can view emails for their recruits" ON user_emails;
DROP POLICY IF EXISTS "Users can view emails sent to them" ON user_emails;
DROP POLICY IF EXISTS "Senders can view emails they sent" ON user_emails;
DROP POLICY IF EXISTS "Users can insert emails for their recruits" ON user_emails;
DROP POLICY IF EXISTS "Senders can update their own emails" ON user_emails;

-- ===========================================
-- SELECT POLICIES
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
-- A user is a recruiter if they are listed as recruiter_id on the recruit's profile
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
    WHERE up.user_id = auth.uid()
    AND up.is_admin = true
  )
);

-- ===========================================
-- INSERT POLICIES
-- ===========================================

-- Policy 5: Users can insert emails for recruits they manage
CREATE POLICY "user_emails_insert_recruiter"
ON user_emails FOR INSERT
WITH CHECK (
  -- Sender must be the current user
  sender_id = auth.uid()
  AND (
    -- Either sending to themselves
    user_id = auth.uid()
    OR
    -- Or to a recruit they manage
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = user_emails.user_id
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
    WHERE up.user_id = auth.uid()
    AND up.is_admin = true
  )
);

-- ===========================================
-- UPDATE POLICIES
-- ===========================================

-- Policy 7: Senders can update their own sent emails
CREATE POLICY "user_emails_update_sender"
ON user_emails FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Policy 8: Admins can update any email
CREATE POLICY "user_emails_update_admin"
ON user_emails FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.is_admin = true
  )
);

-- ===========================================
-- DELETE POLICIES
-- ===========================================

-- Policy 9: Admins can delete emails
CREATE POLICY "user_emails_delete_admin"
ON user_emails FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.user_id = auth.uid()
    AND up.is_admin = true
  )
);

-- Add comment for documentation
COMMENT ON TABLE user_emails IS 'Stores email records for the recruiting pipeline. user_id = recipient/recruit, sender_id = person who sent the email.';
