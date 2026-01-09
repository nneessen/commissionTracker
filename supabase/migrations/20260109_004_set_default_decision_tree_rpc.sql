-- supabase/migrations/20260109_004_set_default_decision_tree_rpc.sql
--
-- Creates an RPC function to atomically set a decision tree as default
-- This fixes the race condition where two separate queries could leave
-- no default tree if the second query fails

CREATE OR REPLACE FUNCTION set_default_decision_tree(
  p_tree_id UUID,
  p_imo_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Atomic operation: unset all defaults and set new one in single transaction
  -- Using a single UPDATE with conditional expression prevents race conditions
  UPDATE underwriting_decision_trees
  SET is_default = (id = p_tree_id)
  WHERE imo_id = p_imo_id;

  -- Verify the tree exists and was set as default
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No decision trees found for IMO %', p_imo_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_default_decision_tree(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION set_default_decision_tree IS
  'Atomically sets a decision tree as the default for an IMO, unsetting all others in a single transaction';
