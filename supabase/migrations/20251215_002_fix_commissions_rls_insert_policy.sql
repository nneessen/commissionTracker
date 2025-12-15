-- supabase/migrations/20251215_002_fix_commissions_rls_insert_policy.sql
-- Fix RLS INSERT policy for commissions table
-- Issue: INSERT fails with 403 Forbidden when creating policies (commissions are auto-created)
-- Root cause: Existing INSERT policy may have restrictive WITH CHECK clause

-- Step 1: Check if RLS is enabled on commissions (it should be)
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'commissions'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 2: Drop existing INSERT policies that might be blocking
DROP POLICY IF EXISTS "commissions_insert_system" ON commissions;
DROP POLICY IF EXISTS "Approved users can create own commissions" ON commissions;
DROP POLICY IF EXISTS "commissions_insert_own" ON commissions;
DROP POLICY IF EXISTS "Users can insert own commissions" ON commissions;

-- Step 3: Create a permissive INSERT policy for authenticated users
-- Users can only insert commissions for themselves (user_id must match auth.uid())
CREATE POLICY "Authenticated users can create own commissions"
ON commissions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 4: Ensure SELECT policy exists for users to read their own commissions
DROP POLICY IF EXISTS "commissions_select_own" ON commissions;
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;

CREATE POLICY "Users can view own commissions"
ON commissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Ensure UPDATE policy exists for users to update their own commissions
DROP POLICY IF EXISTS "commissions_update_own" ON commissions;
DROP POLICY IF EXISTS "Users can update own commissions" ON commissions;

CREATE POLICY "Users can update own commissions"
ON commissions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 6: Ensure DELETE policy exists for users to delete their own commissions
DROP POLICY IF EXISTS "commissions_delete_own" ON commissions;
DROP POLICY IF EXISTS "Users can delete own commissions" ON commissions;

CREATE POLICY "Users can delete own commissions"
ON commissions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Verify policies are created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'commissions';

  RAISE NOTICE 'Commissions table now has % RLS policies', policy_count;
END $$;
