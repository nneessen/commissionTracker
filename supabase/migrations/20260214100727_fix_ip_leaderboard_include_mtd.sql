-- supabase/migrations/20260214100727_fix_ip_leaderboard_include_mtd.sql
-- Fix: Return agents with MTD IP > 0 (not just WTD > 0)
-- This allows showing both Top Producers WTD and MTD sections

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
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;
  v_week_start := date_trunc('week', v_today)::DATE;
  v_month_start := date_trunc('month', v_today)::DATE;

  RETURN QUERY
  WITH
  -- Get all agents who have MTD IP (approved policies with effective_date this month)
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
      AND p.effective_date <= v_today
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
    GROUP BY p.user_id
    HAVING COALESCE(SUM(p.annual_premium), 0) > 0
  ),

  -- Get WTD IP for those agents
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
      AND p.effective_date <= v_today
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
IP = approved policies by effective_date. Returns all agents with MTD IP > 0.
Used by weekly IP leaderboard Slack report.
Uses America/New_York timezone. WTD starts on Monday (ISO week).';
