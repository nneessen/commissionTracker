-- Migration: Fix notifications table RLS INSERT policy
-- Description: Allow authenticated users to create notifications for any user
-- This is needed for system-generated notifications (recruiting automation, alerts, etc.)

-- Drop existing INSERT policy if it exists (may be too restrictive)
DO $$
BEGIN
  -- Try to drop any existing INSERT policies on notifications
  DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;
  DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
  DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notifications;
EXCEPTION WHEN OTHERS THEN
  -- Policy doesn't exist, ignore
  NULL;
END $$;

-- Ensure RLS is enabled on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create a permissive INSERT policy for authenticated users
-- This allows the application to create notifications for any user (needed for automation)
CREATE POLICY "Authenticated users can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify SELECT policy exists (users should only see their own notifications)
DO $$
BEGIN
  -- Check if SELECT policy exists, if not create one
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Policy already exists, ignore
  NULL;
END $$;

-- Verify UPDATE policy exists (users should only update their own notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Verify DELETE policy exists (users should only delete their own notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND cmd = 'DELETE'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
      ON notifications
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add comment explaining the INSERT policy
COMMENT ON POLICY "Authenticated users can create notifications" ON notifications IS
  'Allows authenticated users to create notifications for any user. This is necessary for system-generated notifications from recruiting automation, alerts, and other features where one user triggers notifications for another user.';
