-- Migration: Fix timezone bug in get_daily_production_by_agent
-- The function was using UTC dates (CURRENT_DATE) but the app operates in Eastern timezone.
-- After 8 PM Eastern (midnight UTC), policies created earlier the same day (Eastern)
-- would not be included because their UTC date was the previous day.

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
    -- Fixed: Handle NULL first_name or last_name properly
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
    -- FIX: Use Eastern timezone for date comparison instead of UTC
    -- This ensures policies created "today" in Eastern time are included
    -- even after 8 PM Eastern when UTC date advances to the next day
    AND (p.created_at AT TIME ZONE 'America/New_York')::DATE = (NOW() AT TIME ZONE 'America/New_York')::DATE
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
