-- supabase/migrations/20251226_002_agency_slack_integration.sql
-- Add agency-level Slack integration support for multi-workspace hierarchical posting

-- ============================================================================
-- 1. Add agency_id column to slack_integrations
-- ============================================================================

ALTER TABLE slack_integrations
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

COMMENT ON COLUMN slack_integrations.agency_id IS
  'Agency this workspace is connected for. NULL = IMO-level (applies to all agencies)';

-- Index for agency-based lookups
CREATE INDEX IF NOT EXISTS idx_slack_integrations_agency
  ON slack_integrations(agency_id, is_active, connection_status);

-- ============================================================================
-- 2. Drop old unique constraint and add composite unique constraint
-- ============================================================================

-- Drop the old team_id unique constraint if it exists
ALTER TABLE slack_integrations
  DROP CONSTRAINT IF EXISTS slack_integrations_team_id_key;

-- Add composite unique constraint: same workspace can be connected to different agencies
-- but the same (team_id, agency_id) pair cannot exist twice
ALTER TABLE slack_integrations
  ADD CONSTRAINT slack_integrations_team_agency_unique
  UNIQUE (team_id, agency_id);

-- ============================================================================
-- 3. Recursive function to get agency hierarchy (walks up parent chain)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_hierarchy(p_agency_id UUID)
RETURNS TABLE(
  agency_id UUID,
  agency_name TEXT,
  parent_agency_id UUID,
  depth INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE agency_tree AS (
    -- Base case: the starting agency
    SELECT
      a.id,
      a.name::TEXT,
      a.parent_agency_id,
      0 as depth
    FROM agencies a
    WHERE a.id = p_agency_id

    UNION ALL

    -- Recursive case: parent agencies
    SELECT
      a.id,
      a.name::TEXT,
      a.parent_agency_id,
      at.depth + 1
    FROM agencies a
    INNER JOIN agency_tree at ON a.id = at.parent_agency_id
  )
  SELECT
    at.id as agency_id,
    at.name as agency_name,
    at.parent_agency_id,
    at.depth
  FROM agency_tree at
  ORDER BY at.depth ASC;
END;
$$;

COMMENT ON FUNCTION get_agency_hierarchy(UUID) IS
  'Returns all agencies in the hierarchy starting from the given agency up to the root.
   Depth 0 = the starting agency, depth 1 = parent, depth 2 = grandparent, etc.';

-- ============================================================================
-- 4. Function to get all Slack integrations for an agency hierarchy
-- ============================================================================

CREATE OR REPLACE FUNCTION get_slack_integrations_for_agency_hierarchy(p_agency_id UUID)
RETURNS TABLE(
  integration_id UUID,
  agency_id UUID,
  agency_name TEXT,
  team_id TEXT,
  team_name TEXT,
  display_name TEXT,
  policy_channel_id TEXT,
  policy_channel_name TEXT,
  include_client_info BOOLEAN,
  include_leaderboard BOOLEAN,
  hierarchy_depth INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id UUID;
BEGIN
  -- Get the IMO ID for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = p_agency_id;

  RETURN QUERY
  SELECT
    si.id as integration_id,
    h.agency_id,
    h.agency_name,
    si.team_id,
    si.team_name,
    si.display_name,
    si.policy_channel_id,
    si.policy_channel_name,
    si.include_client_info,
    si.include_leaderboard_with_policy as include_leaderboard,
    h.depth as hierarchy_depth
  FROM get_agency_hierarchy(p_agency_id) h
  LEFT JOIN slack_integrations si ON (
    -- Match agency-level integration
    si.agency_id = h.agency_id
    AND si.is_active = true
    AND si.connection_status = 'connected'
    AND si.policy_channel_id IS NOT NULL
  )
  WHERE si.id IS NOT NULL

  UNION ALL

  -- Also include IMO-level integrations (agency_id IS NULL)
  SELECT
    si.id as integration_id,
    NULL::UUID as agency_id,
    'IMO-Level'::TEXT as agency_name,
    si.team_id,
    si.team_name,
    si.display_name,
    si.policy_channel_id,
    si.policy_channel_name,
    si.include_client_info,
    si.include_leaderboard_with_policy as include_leaderboard,
    999 as hierarchy_depth  -- Put IMO-level at the end
  FROM slack_integrations si
  WHERE si.imo_id = v_imo_id
    AND si.agency_id IS NULL
    AND si.is_active = true
    AND si.connection_status = 'connected'
    AND si.policy_channel_id IS NOT NULL

  ORDER BY hierarchy_depth ASC;
END;
$$;

COMMENT ON FUNCTION get_slack_integrations_for_agency_hierarchy(UUID) IS
  'Returns all active Slack integrations for the given agency and all its parent agencies,
   plus any IMO-level integrations. Use this to post policy notifications to all
   workspaces in the hierarchy.';

-- ============================================================================
-- 5. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_agency_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_slack_integrations_for_agency_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_hierarchy(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_slack_integrations_for_agency_hierarchy(UUID) TO service_role;
