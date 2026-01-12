-- Migration: Delete client when policy is deleted
-- Date: 2024-12-14
-- Requirement: Deleting a policy should also delete the associated client
-- Note: Status changes (cancelled, etc.) should NOT affect the client

-- Create trigger function to delete client when policy is deleted
CREATE OR REPLACE FUNCTION delete_client_on_policy_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only delete client if the policy had a client_id
  IF OLD.client_id IS NOT NULL THEN
    DELETE FROM clients WHERE id = OLD.client_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger that fires AFTER DELETE on policies
DROP TRIGGER IF EXISTS trigger_delete_client_on_policy_delete ON policies;

CREATE TRIGGER trigger_delete_client_on_policy_delete
  AFTER DELETE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION delete_client_on_policy_delete();

COMMENT ON FUNCTION delete_client_on_policy_delete() IS
'Deletes the associated client when a policy is deleted. Only triggers on DELETE, not on status changes.';
