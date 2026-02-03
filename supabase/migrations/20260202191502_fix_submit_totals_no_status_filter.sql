-- supabase/migrations/20260202191502_fix_submit_totals_no_status_filter.sql
-- Fix: Remove status filter from submit totals - we track AP by submit_date only
--
-- User requirement: "statuses don't matter - we just track AP by submit date regardless of policy status"
-- This applies to both functions:
-- 1. get_all_agencies_submit_totals - agency rankings
-- 2. get_slack_leaderboard_with_periods - agent leaderboard

-- ============================================================================
-- Function 1: get_all_agencies_submit_totals (with MLM hierarchy)
-- ============================================================================
DROP FUNCTION IF EXISTS get_all_agencies_submit_totals(UUID);

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

  -- For each agency, find ALL agents in the downward hierarchy using hierarchy_path
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      u.hierarchy_path = aa.owner_hierarchy_path
      OR u.hierarchy_path LIKE aa.owner_hierarchy_path || '.%'
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

  -- WTD totals per agency - NO STATUS FILTER, just submit_date
  wtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(DISTINCT p.id) AS wtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND p.submit_date IS NOT NULL
      AND p.submit_date >= v_week_start
      AND p.submit_date <= v_today
    GROUP BY aha.agency_id
  ),

  -- MTD totals per agency - NO STATUS FILTER, just submit_date
  mtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(DISTINCT p.id) AS mtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND p.submit_date IS NOT NULL
      AND p.submit_date >= v_month_start
      AND p.submit_date <= v_today
    GROUP BY aha.agency_id
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

GRANT EXECUTE ON FUNCTION get_all_agencies_submit_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_agencies_submit_totals(UUID) TO service_role;

COMMENT ON FUNCTION get_all_agencies_submit_totals(UUID) IS
'Returns WTD and MTD submit totals for ALL active agencies with FULL MLM HIERARCHY aggregation.
NO STATUS FILTER - tracks AP purely by submit_date.
Self Made Financial includes all sub-agency totals (Ten Toes Down, 1 of 1 Financial, The Standard).
Uses America/New_York timezone. WTD starts on Monday (ISO week).';


-- ============================================================================
-- Function 2: get_slack_leaderboard_with_periods (agent data)
-- ============================================================================
DROP FUNCTION IF EXISTS get_slack_leaderboard_with_periods(UUID, UUID);

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
  v_week_start := date_trunc('week', v_today)::DATE;
  v_month_start := date_trunc('month', v_today)::DATE;

  RETURN QUERY
  WITH
  -- Get agents who have sales TODAY - NO STATUS FILTER, just submit_date
  today_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS today_ap,
      COUNT(p.id) AS today_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date = v_today
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
    GROUP BY p.user_id
    HAVING COALESCE(SUM(p.annual_premium), 0) > 0
  ),
  -- Get WTD totals for those same agents - NO STATUS FILTER
  wtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(p.id) AS wtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date >= v_week_start
      AND p.submit_date <= v_today
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
      AND p.user_id IN (SELECT user_id FROM today_sales)
    GROUP BY p.user_id
  ),
  -- Get MTD totals for those same agents - NO STATUS FILTER
  mtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(p.id) AS mtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date >= v_month_start
      AND p.submit_date <= v_today
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

GRANT EXECUTE ON FUNCTION get_slack_leaderboard_with_periods(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_slack_leaderboard_with_periods(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_slack_leaderboard_with_periods(UUID, UUID) IS
'Returns agents who had sales TODAY with their WTD and MTD totals.
NO STATUS FILTER - tracks AP purely by submit_date.
Used by Slack daily leaderboard. Only includes agents with sales today.
Uses America/New_York timezone. WTD starts on Monday (ISO week).';
