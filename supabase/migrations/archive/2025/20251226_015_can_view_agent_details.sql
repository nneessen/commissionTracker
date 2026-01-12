-- Migration: Add permission check for viewing agent details
-- Only allows viewing agents if caller is:
-- 1. An admin (is_admin = true)
-- 2. The agent themselves
-- 3. An upline of the agent (agent's path contains caller's ID)

CREATE OR REPLACE FUNCTION can_view_agent_details(p_agent_id uuid)
RETURNS boolean AS $$
DECLARE
  v_current_user_id uuid;
  v_is_admin boolean;
  v_agent_hierarchy_path text;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if viewing self
  IF v_current_user_id = p_agent_id THEN
    RETURN true;
  END IF;

  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin
  FROM user_profiles
  WHERE id = v_current_user_id;

  IF v_is_admin = true THEN
    RETURN true;
  END IF;

  -- Check if agent is a downline (agent's path contains current user's ID)
  SELECT hierarchy_path INTO v_agent_hierarchy_path
  FROM user_profiles
  WHERE id = p_agent_id;

  IF v_agent_hierarchy_path IS NULL THEN
    RETURN false;
  END IF;

  -- Agent is a downline if their path contains the current user's ID
  -- The current user's ID must appear in the path BEFORE the agent's ID
  RETURN v_agent_hierarchy_path LIKE '%' || v_current_user_id::text || '.%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_view_agent_details(uuid) IS
  'Checks if current user can view agent details (admin, self, or upline only)';
