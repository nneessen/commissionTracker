-- supabase/migrations/20260129152701_fix_leaderboard_submit_date_filter.sql
-- Migration: Fix leaderboard to filter by submit_date instead of created_at
--
-- PROBLEM: The get_daily_production_by_agent() function was filtering by created_at,
-- which meant policies created TODAY with old submit_dates appeared in the leaderboard.
--
-- FIX: Filter by submit_date instead, with a COALESCE fallback to created_at for
-- legacy records that don't have submit_date set.

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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id as agent_id,
    -- Handle NULL first_name or last_name properly
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) as agent_name,
    up.email as agent_email,
    usp.slack_member_id,
    COALESCE(SUM(p.annual_premium), 0)::NUMERIC as total_annual_premium,
    COUNT(p.id)::INTEGER as policy_count
  FROM policies p
  JOIN user_profiles up ON p.user_id = up.id
  LEFT JOIN user_slack_preferences usp ON usp.user_id = up.id AND usp.imo_id = p.imo_id
  WHERE p.imo_id = p_imo_id
    -- FIX: Use submit_date for filtering (with created_at fallback for legacy records)
    -- This ensures only policies SUBMITTED TODAY appear in the leaderboard
    -- The COALESCE handles older records that may not have submit_date set
    AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE)
        = (NOW() AT TIME ZONE 'America/New_York')::DATE
    AND p.status IN ('active', 'pending', 'approved')
    -- Use get_agency_descendants to include child agencies
    -- If p_agency_id is NULL, include all agencies in IMO
    AND (p_agency_id IS NULL OR p.agency_id IN (
      SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
    ))
  GROUP BY p.user_id, up.first_name, up.last_name, up.email, usp.slack_member_id
  ORDER BY total_annual_premium DESC;
END;
$$;

COMMENT ON FUNCTION get_daily_production_by_agent(UUID, UUID) IS
'Returns today''s production by agent for Slack leaderboard.
Filters by submit_date (with created_at fallback) to ensure only policies
SUBMITTED TODAY are included. Uses America/New_York timezone.

FIXED (2026-01-29): Changed from created_at to submit_date filtering to prevent
backdated policies from appearing in the daily leaderboard.';
