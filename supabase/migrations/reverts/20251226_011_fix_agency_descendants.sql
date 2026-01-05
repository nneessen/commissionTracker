-- supabase/migrations/reverts/20251226_011_fix_agency_descendants.sql
-- Revert the agency descendants migration
-- This restores the original get_daily_production_by_agent that uses hierarchy (UP) instead of descendants (DOWN)

-- ============================================================================
-- 1. Drop the get_agency_descendants function
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_descendants(UUID);

-- ============================================================================
-- 2. Restore original get_daily_production_by_agent using get_agency_hierarchy
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
    AND (p_agency_id IS NULL OR p.agency_id = p_agency_id OR p.agency_id IN (
      SELECT h.agency_id FROM get_agency_hierarchy(p_agency_id) h
    ))
  GROUP BY p.user_id, up.first_name, up.last_name, up.email, usp.slack_member_id
  ORDER BY total_annual_premium DESC;
END;
$$;

COMMENT ON FUNCTION get_daily_production_by_agent(UUID, UUID) IS
'Returns daily (today only) production by agent for leaderboard.
Returns agent info including slack_member_id for @mentions.
Sorted by total annual premium descending.

NOTE: This is the REVERTED version that uses get_agency_hierarchy (walks UP to parents).
This causes leaderboards to show agents from parent agencies incorrectly.';

-- ============================================================================
-- Usage: Run this script to rollback migration 20251226_011
-- ./scripts/apply-migration.sh supabase/migrations/reverts/20251226_011_fix_agency_descendants.sql
-- ============================================================================
