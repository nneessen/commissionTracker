-- supabase/migrations/20260202184953_slack_wtd_mtd_functions.sql
-- Add WTD/MTD tracking functions for Slack leaderboards
--
-- Creates:
-- 1. get_slack_leaderboard_with_periods() - Agent data with today/WTD/MTD (for daily Slack)
-- 2. get_all_agencies_submit_totals() - All agencies WTD/MTD totals for comparison

-- ============================================================================
-- Function 1: get_slack_leaderboard_with_periods
-- Returns agents who had sales TODAY with their WTD and MTD totals
-- Used by Slack daily leaderboard to show agent progress
-- ============================================================================
CREATE OR REPLACE FUNCTION get_slack_leaderboard_with_periods(
  p_imo_id UUID,
  p_agency_id UUID DEFAULT NULL
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  slack_member_id TEXT,
  today_ap NUMERIC,
  today_policies INTEGER,
  wtd_ap NUMERIC,
  wtd_policies INTEGER,
  mtd_ap NUMERIC,
  mtd_policies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;
  -- PostgreSQL date_trunc('week', ...) returns Monday (ISO week start)
  v_week_start := date_trunc('week', v_today)::DATE;
  v_month_start := date_trunc('month', v_today)::DATE;

  RETURN QUERY
  WITH
  -- Get agents who have sales TODAY (these are the ones we'll show)
  today_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS today_ap,
      COUNT(p.id) AS today_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) = v_today
      AND p.status IN ('active', 'pending', 'approved')
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
    GROUP BY p.user_id
    HAVING COALESCE(SUM(p.annual_premium), 0) > 0
  ),
  -- Get WTD totals for those same agents
  wtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(p.id) AS wtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_week_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
      AND p.user_id IN (SELECT user_id FROM today_sales)
    GROUP BY p.user_id
  ),
  -- Get MTD totals for those same agents
  mtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(p.id) AS mtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_month_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
      AND p.user_id IN (SELECT user_id FROM today_sales)
    GROUP BY p.user_id
  )
  SELECT
    ts.user_id AS agent_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')), ''),
      up.email,
      'Unknown'
    ) AS agent_name,
    up.email AS agent_email,
    usp.slack_member_id,
    ts.today_ap::NUMERIC AS today_ap,
    ts.today_policies::INTEGER AS today_policies,
    COALESCE(ws.wtd_ap, ts.today_ap)::NUMERIC AS wtd_ap,
    COALESCE(ws.wtd_policies, ts.today_policies)::INTEGER AS wtd_policies,
    COALESCE(ms.mtd_ap, ts.today_ap)::NUMERIC AS mtd_ap,
    COALESCE(ms.mtd_policies, ts.today_policies)::INTEGER AS mtd_policies
  FROM today_sales ts
  JOIN user_profiles up ON ts.user_id = up.id
  LEFT JOIN user_slack_preferences usp ON usp.user_id = up.id AND usp.imo_id = p_imo_id
  LEFT JOIN wtd_sales ws ON ws.user_id = ts.user_id
  LEFT JOIN mtd_sales ms ON ms.user_id = ts.user_id
  ORDER BY ts.today_ap DESC;
END;
$$;

COMMENT ON FUNCTION get_slack_leaderboard_with_periods(UUID, UUID) IS
'Returns agents who had sales TODAY with their WTD and MTD totals.
Used by Slack daily leaderboard. Only includes agents with sales today.
Uses America/New_York timezone. WTD starts on Monday (ISO week).';


-- ============================================================================
-- Function 2: get_all_agencies_submit_totals
-- Returns submit totals for ALL active agencies in the IMO
-- Used for agency comparison section in Slack leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_agencies_submit_totals(
  p_imo_id UUID
)
RETURNS TABLE (
  agency_id UUID,
  agency_name TEXT,
  wtd_ap NUMERIC,
  wtd_policies INTEGER,
  mtd_ap NUMERIC,
  mtd_policies INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- Get all active agencies in this IMO
  active_agencies AS (
    SELECT a.id, a.name
    FROM agencies a
    WHERE a.imo_id = p_imo_id
      AND a.is_active = true
  ),
  -- WTD totals per agency (using agency_id on policy, not user's current agency)
  wtd_totals AS (
    SELECT
      p.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(p.id) AS wtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_week_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
      AND p.agency_id IS NOT NULL
    GROUP BY p.agency_id
  ),
  -- MTD totals per agency
  mtd_totals AS (
    SELECT
      p.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(p.id) AS mtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_month_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
      AND p.agency_id IS NOT NULL
    GROUP BY p.agency_id
  )
  SELECT
    aa.id AS agency_id,
    aa.name AS agency_name,
    COALESCE(wt.wtd_ap, 0)::NUMERIC AS wtd_ap,
    COALESCE(wt.wtd_policies, 0)::INTEGER AS wtd_policies,
    COALESCE(mt.mtd_ap, 0)::NUMERIC AS mtd_ap,
    COALESCE(mt.mtd_policies, 0)::INTEGER AS mtd_policies
  FROM active_agencies aa
  LEFT JOIN wtd_totals wt ON wt.agency_id = aa.id
  LEFT JOIN mtd_totals mt ON mt.agency_id = aa.id
  ORDER BY COALESCE(mt.mtd_ap, 0) DESC, aa.name ASC;
END;
$$;

COMMENT ON FUNCTION get_all_agencies_submit_totals(UUID) IS
'Returns WTD and MTD submit totals for ALL active agencies in the IMO.
Used for agency comparison section in Slack daily leaderboard.
Uses America/New_York timezone. WTD starts on Monday (ISO week).
Ordered by MTD AP descending for ranking display.';
