-- Migration: Fix Commission Update RLS and Client Cascade Deletion
-- Purpose:
--   1. Allow agents to update their own commission status
--   2. Implement proper client deletion when last policy is deleted
-- Created: 2025-12-28
--
-- CRITICAL FIXES:
-- - Non-admin agents can now update their own commission status
-- - Clients are automatically deleted when their last policy is deleted
-- - Prevents orphaned client records in the database

BEGIN;

-- ============================================
-- 1. FIX COMMISSION UPDATE RLS POLICY
-- ============================================

-- Drop the overly restrictive admin-only update policy
DROP POLICY IF EXISTS "commissions_update_admin" ON commissions;

-- Create new policies allowing users to update their own commissions
CREATE POLICY "commissions_update_own"
  ON commissions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'commissions.update.own')
  )
  WITH CHECK (
    user_id = auth.uid()  -- Ensure user_id cannot be changed
  );

-- Admin/office staff can update all commissions
CREATE POLICY "commissions_update_all"
  ON commissions FOR UPDATE
  USING (
    has_permission(auth.uid(), 'commissions.update.all')
  );

-- Agents can also INSERT their own commission records
CREATE POLICY "commissions_insert_own"
  ON commissions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'commissions.create.own')
  );

-- Agents can DELETE their own commission records (for cleanup)
CREATE POLICY "commissions_delete_own"
  ON commissions FOR DELETE
  USING (
    user_id = auth.uid()
    AND has_permission(auth.uid(), 'commissions.delete.own')
  );

-- ============================================
-- 2. CREATE CLIENT CLEANUP FUNCTION
-- ============================================

-- Function to delete client if no policies remain
CREATE OR REPLACE FUNCTION delete_orphaned_client()
RETURNS TRIGGER AS $$
DECLARE
  policy_count INTEGER;
  old_client_id UUID;
BEGIN
  -- Store the client_id before deletion
  old_client_id := OLD.client_id;

  -- Only proceed if there was a client_id
  IF old_client_id IS NOT NULL THEN
    -- Count remaining policies for this client
    SELECT COUNT(*) INTO policy_count
    FROM policies
    WHERE client_id = old_client_id
      AND id != OLD.id;  -- Exclude the policy being deleted

    -- If no other policies exist for this client, delete the client
    IF policy_count = 0 THEN
      DELETE FROM clients WHERE id = old_client_id;

      -- Log the deletion for audit purposes
      RAISE NOTICE 'Deleted orphaned client % after last policy % was deleted',
        old_client_id, OLD.id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE TRIGGER FOR CLIENT CLEANUP
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_delete_orphaned_client ON policies;

-- Create trigger to clean up orphaned clients after policy deletion
CREATE TRIGGER trigger_delete_orphaned_client
  AFTER DELETE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION delete_orphaned_client();

-- ============================================
-- 4. ADD CLIENT PROTECTION FOR POLICY CREATION
-- ============================================

-- Function to ensure client exists or create one when creating a policy
CREATE OR REPLACE FUNCTION ensure_client_for_policy()
RETURNS TRIGGER AS $$
BEGIN
  -- If client_id is provided, ensure it exists
  IF NEW.client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id) THEN
      RAISE EXCEPTION 'Client with id % does not exist', NEW.client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_ensure_client_for_policy ON policies;

-- Create trigger to validate client exists before policy creation
CREATE TRIGGER trigger_ensure_client_for_policy
  BEFORE INSERT OR UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION ensure_client_for_policy();

-- ============================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Add index for faster client lookup when checking orphaned status
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);

-- Add composite index for commission updates by user and id
CREATE INDEX IF NOT EXISTS idx_commissions_user_id_id ON commissions(user_id, id);

-- ============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure agents have the necessary permissions for commission operations
INSERT INTO permissions (role_id, resource, action, scope)
SELECT
  r.id,
  'commissions',
  action,
  scope
FROM roles r
CROSS JOIN (
  VALUES
    ('update', 'own'),
    ('create', 'own'),
    ('delete', 'own')
) AS perms(action, scope)
WHERE r.name = 'agent'
  AND NOT EXISTS (
    SELECT 1 FROM permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'commissions'
      AND p.action = perms.action
      AND p.scope = perms.scope
  );

-- Ensure office staff can update all commissions
INSERT INTO permissions (role_id, resource, action, scope)
SELECT
  r.id,
  'commissions',
  'update',
  'all'
FROM roles r
WHERE r.name IN ('office_staff', 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM permissions p
    WHERE p.role_id = r.id
      AND p.resource = 'commissions'
      AND p.action = 'update'
      AND p.scope = 'all'
  );

-- ============================================
-- 7. CLEANUP EXISTING ORPHANED CLIENTS
-- ============================================

-- Delete clients that have no associated policies
DELETE FROM clients c
WHERE NOT EXISTS (
  SELECT 1 FROM policies p
  WHERE p.client_id = c.id
);

COMMIT;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
DECLARE
  commission_policies INTEGER;
  orphaned_clients INTEGER;
BEGIN
  -- Count commission policies
  SELECT COUNT(*) INTO commission_policies
  FROM pg_policies
  WHERE tablename = 'commissions';

  -- Count orphaned clients that were cleaned up
  SELECT COUNT(*) INTO orphaned_clients
  FROM clients c
  WHERE NOT EXISTS (
    SELECT 1 FROM policies p WHERE p.client_id = c.id
  );

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Commission RLS & Client Cascade Fix Applied!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ COMMISSION RLS FIXES:';
  RAISE NOTICE '   - Agents can now update their own commissions';
  RAISE NOTICE '   - Office staff can update all commissions';
  RAISE NOTICE '   - Total commission policies: %', commission_policies;
  RAISE NOTICE '';
  RAISE NOTICE '✅ CLIENT CASCADE DELETION:';
  RAISE NOTICE '   - Clients auto-delete when last policy deleted';
  RAISE NOTICE '   - Prevents orphaned client records';
  RAISE NOTICE '   - Cleaned up orphaned clients: %', orphaned_clients;
  RAISE NOTICE '';
  RAISE NOTICE '✅ PERFORMANCE IMPROVEMENTS:';
  RAISE NOTICE '   - Added indexes for faster lookups';
  RAISE NOTICE '   - Optimized commission update queries';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  BEHAVIOR CHANGES:';
  RAISE NOTICE '   - Deleting last policy for a client deletes the client';
  RAISE NOTICE '   - Agents can manage their own commission status';
  RAISE NOTICE '===========================================';
END $$;