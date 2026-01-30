-- supabase/migrations/20260130122606_fix_policy_client_cascade_deletion.sql
-- Migration: Fix cascade deletion bug for shared clients
--
-- BUG: When deleting a policy, the trigger unconditionally deleted the associated
-- client, which cascaded to delete ALL policies sharing that client.
--
-- FIX: Only delete the client if no other policies reference it.

-- =============================================================================
-- 1. Fix the trigger function to check for shared clients
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_client_on_policy_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_policies_count INTEGER;
BEGIN
  -- Only attempt client deletion if the policy had a client_id
  IF OLD.client_id IS NOT NULL THEN
    -- Count other policies that share the same client_id
    SELECT COUNT(*) INTO other_policies_count
    FROM policies
    WHERE client_id = OLD.client_id
    AND id != OLD.id;

    -- Only delete client if no other policies reference it (orphan cleanup)
    IF other_policies_count = 0 THEN
      DELETE FROM clients WHERE id = OLD.client_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- =============================================================================
-- 2. Update comment to reflect new behavior
-- =============================================================================

COMMENT ON FUNCTION delete_client_on_policy_delete() IS
'Deletes the associated client when a policy is deleted, but ONLY if no other
policies share the same client. This prevents cascade deletion bugs where
deleting one policy would delete all policies for the same client.';

-- =============================================================================
-- 3. Verify the trigger exists (recreate if needed for consistency)
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_delete_client_on_policy_delete ON policies;

CREATE TRIGGER trigger_delete_client_on_policy_delete
  AFTER DELETE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION delete_client_on_policy_delete();

COMMENT ON TRIGGER trigger_delete_client_on_policy_delete ON policies IS
'Cleans up orphaned clients after policy deletion. Only deletes client if no other policies reference it.';
