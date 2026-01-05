-- supabase/migrations/reverts/20260105_001_fix_leaderboard_names.sql
-- Reverts the NULL name handling fix in get_daily_production_by_agent
--
-- To apply this revert:
--   ./scripts/apply-migration.sh supabase/migrations/reverts/20260105_001_fix_leaderboard_names.sql

-- Revert to original function implementation (from 20251226_011_fix_agency_descendants.sql)
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
    -- Original: NULL propagation issue when first_name or last_name is NULL
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

NOTE: This is the reverted version. The NULL name handling fix was removed.';
