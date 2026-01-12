-- supabase/migrations/20251226_011_fix_agency_descendants.sql
-- Fix scoreboard scoping: walk DOWN hierarchy to children, not UP to parents

-- ============================================================================
-- Create function to get agency descendants (walks DOWN the tree)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_descendants(p_agency_id UUID)
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

    -- Recursive case: CHILD agencies (walk DOWN)
    -- Children have parent_agency_id pointing to current agency
    -- Depth limit prevents infinite loops from malformed data
    SELECT
      a.id,
      a.name::TEXT,
      a.parent_agency_id,
      at.depth + 1
    FROM agencies a
    INNER JOIN agency_tree at ON a.parent_agency_id = at.id
    WHERE at.depth < 50  -- Guard against infinite recursion
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

COMMENT ON FUNCTION get_agency_descendants(UUID) IS
  'Returns all agencies in the hierarchy starting from the given agency DOWN to all children.
   Depth 0 = the starting agency, depth 1 = direct children, depth 2 = grandchildren, etc.
   Use this for scoreboard scoping where parent agencies should see all child sales.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_agency_descendants(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_descendants(UUID) TO service_role;

-- ============================================================================
-- Update get_daily_production_by_agent to use descendants (not hierarchy)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_production_by_agent(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  slack_member_id TEXT,
  total_annual_premium NUMERIC,
  policy_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name,
    up.email as agent_email,
    usp.slack_member_id,
    COALESCE(SUM(p.annual_premium), 0)::NUMERIC as total_annual_premium,
    COUNT(p.id)::INTEGER as policy_count
  FROM policies p
  JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN user_slack_preferences usp ON usp.user_id = up.id AND usp.imo_id = p.imo_id
  WHERE p.imo_id = p_imo_id
    AND p.created_at::DATE = CURRENT_DATE
    AND p.status IN ('active', 'pending', 'approved')
    -- Changed: Use get_agency_descendants to include child agencies
    -- If p_agency_id is NULL, include all agencies in IMO
    -- Otherwise, include the agency and all its descendants
    AND (p_agency_id IS NULL OR p.agency_id IN (
      SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
    ))
  GROUP BY p.user_id, up.first_name, up.last_name, up.email, usp.slack_member_id
  ORDER BY total_annual_premium DESC;
END;
$$;

COMMENT ON FUNCTION get_daily_production_by_agent(UUID, UUID) IS
'Returns daily (today only) production by agent for leaderboard.
Returns agent info including slack_member_id for @mentions.
Sorted by total annual premium descending.

UPDATED: Now uses get_agency_descendants to properly scope scoreboards:
- The Standard scoreboard shows only The Standard sales
- Self Made Financial scoreboard shows Self Made + all child agencies (including The Standard)';
