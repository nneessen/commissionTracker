-- supabase/migrations/20260223084334_fix_ip_leaderboard_previous_week.sql
-- Fix: WTD should report PREVIOUS week (Mon-Sun), not the current week
-- When run on Monday, the current week has 0 data. We want last week's complete numbers.

-- ============================================================================
-- Fix get_ip_leaderboard_with_periods: use previous week Mon-Sun for WTD
-- ============================================================================
DROP FUNCTION IF EXISTS get_ip_leaderboard_with_periods(UUID, UUID);

CREATE OR REPLACE FUNCTION get_ip_leaderboard_with_periods(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  slack_member_id TEXT,
  wtd_ip NUMERIC,
  wtd_policies INTEGER,
  mtd_ip NUMERIC,
  mtd_policies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_week_end DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;

  -- WTD = previous week Mon-Sun (so on Monday we report the just-completed week)
  v_week_end   := date_trunc('week', v_today)::DATE - INTERVAL '1 day'; -- last Sunday
  v_week_start := v_week_end - INTERVAL '6 days';                        -- last Monday

  -- MTD = month containing last Sunday, up through last Sunday
  v_month_start := date_trunc('month', v_week_end)::DATE;

  RETURN QUERY
  WITH
  -- Get all agents who have MTD IP (approved policies with effective_date this month through last Sunday)
  mtd_ip AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ip,
      COUNT(p.id) AS mtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= v_month_start
      AND p.effective_date <= v_week_end
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
    GROUP BY p.user_id
    HAVING COALESCE(SUM(p.annual_premium), 0) > 0
  ),

  -- Get WTD IP for those agents (previous week Mon-Sun)
  wtd_ip AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ip,
      COUNT(p.id) AS wtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= v_week_start
      AND p.effective_date <= v_week_end
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
      AND p.user_id IN (SELECT user_id FROM mtd_ip)
    GROUP BY p.user_id
  )

  SELECT
    mi.user_id AS agent_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) AS agent_name,
    up.email AS agent_email,
    usp.slack_member_id,
    COALESCE(wi.wtd_ip, 0)::NUMERIC AS wtd_ip,
    COALESCE(wi.wtd_policies, 0)::INTEGER AS wtd_policies,
    mi.mtd_ip::NUMERIC AS mtd_ip,
    mi.mtd_policies::INTEGER AS mtd_policies
  FROM mtd_ip mi
  JOIN user_profiles up ON mi.user_id = up.id
  LEFT JOIN user_slack_preferences usp ON usp.user_id = up.id AND usp.imo_id = p_imo_id
  LEFT JOIN wtd_ip wi ON wi.user_id = mi.user_id
  ORDER BY mi.mtd_ip DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ip_leaderboard_with_periods(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ip_leaderboard_with_periods(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_ip_leaderboard_with_periods(UUID, UUID) IS
'Returns agents who had IP (issued premium) this MONTH with their WTD and MTD totals.
WTD = previous week Mon-Sun (so Monday reports show the just-completed week).
MTD = start of last-Sunday''s month through last Sunday.
IP = approved policies by effective_date. Returns all agents with MTD IP > 0.
Used by weekly IP leaderboard Slack report.
Uses America/New_York timezone. WTD starts on Monday (ISO week).';

-- ============================================================================
-- Fix get_agencies_ip_totals: use previous week Mon-Sun for WTD
-- ============================================================================
DROP FUNCTION IF EXISTS get_agencies_ip_totals(UUID);

CREATE OR REPLACE FUNCTION get_agencies_ip_totals(
  p_imo_id UUID
)
RETURNS TABLE (
  agency_id UUID,
  agency_name TEXT,
  wtd_ip NUMERIC,
  wtd_policies INTEGER,
  mtd_ip NUMERIC,
  mtd_policies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_week_end DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;

  -- WTD = previous week Mon-Sun
  v_week_end   := date_trunc('week', v_today)::DATE - INTERVAL '1 day'; -- last Sunday
  v_week_start := v_week_end - INTERVAL '6 days';                        -- last Monday

  -- MTD = month containing last Sunday, up through last Sunday
  v_month_start := date_trunc('month', v_week_end)::DATE;

  RETURN QUERY
  WITH
  -- Get all active agencies with their owner's hierarchy path
  active_agencies AS (
    SELECT
      a.id,
      a.name,
      a.owner_id,
      o.hierarchy_path AS owner_hierarchy_path
    FROM agencies a
    INNER JOIN user_profiles o ON o.id = a.owner_id
    WHERE a.imo_id = p_imo_id
      AND a.is_active = true
      AND o.hierarchy_path IS NOT NULL
  ),

  -- For each agency, find ALL agents in the downward hierarchy
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      u.hierarchy_path = aa.owner_hierarchy_path
      OR u.hierarchy_path LIKE aa.owner_hierarchy_path || '.%'
      OR u.agency_id IN (SELECT d.agency_id FROM get_agency_descendants(aa.id) d)
    )
    WHERE u.imo_id = p_imo_id
      AND u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- WTD IP totals per agency (previous week Mon-Sun)
  wtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ip,
      COUNT(DISTINCT p.id) AS wtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= v_week_start
      AND p.effective_date <= v_week_end
    GROUP BY aha.agency_id
  ),

  -- MTD IP totals per agency (month through last Sunday)
  mtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ip,
      COUNT(DISTINCT p.id) AS mtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= v_month_start
      AND p.effective_date <= v_week_end
    GROUP BY aha.agency_id
  )

  SELECT
    aa.id AS agency_id,
    aa.name AS agency_name,
    COALESCE(wt.wtd_ip, 0)::NUMERIC AS wtd_ip,
    COALESCE(wt.wtd_policies, 0)::INTEGER AS wtd_policies,
    COALESCE(mt.mtd_ip, 0)::NUMERIC AS mtd_ip,
    COALESCE(mt.mtd_policies, 0)::INTEGER AS mtd_policies
  FROM active_agencies aa
  LEFT JOIN wtd_totals wt ON wt.agency_id = aa.id
  LEFT JOIN mtd_totals mt ON mt.agency_id = aa.id
  ORDER BY COALESCE(mt.mtd_ip, 0) DESC, aa.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agencies_ip_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agencies_ip_totals(UUID) TO service_role;

COMMENT ON FUNCTION get_agencies_ip_totals(UUID) IS
'Returns agency IP totals with WTD (previous week Mon-Sun) and MTD (month through last Sunday).
IP = approved policies by effective_date.
Used by weekly IP leaderboard Slack report.
Uses America/New_York timezone.';
