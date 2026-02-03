-- supabase/migrations/20260203111935_fix_slack_leaderboard_submit_date_only.sql
--
-- Fix: Ensure Slack leaderboard uses ONLY submit_date, NOT created_at
--
-- Root Cause: Migration 20260202191502 may not have been applied, leaving the
-- buggy version from 20260202184953 which used:
--   COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE)
-- This caused policies CREATED today (regardless of submit_date) to appear.
--
-- This migration drops and recreates the function with strict submit_date filtering.
-- No COALESCE with created_at. No status filter (per user requirement).

-- ============================================================================
-- Function: get_slack_leaderboard_with_periods
-- Returns agents who submitted policies TODAY (by submit_date only)
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
SET search_path = public
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
  -- Get agents who have sales TODAY - STRICT submit_date only, NO COALESCE with created_at
  today_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS today_ap,
      COUNT(p.id) AS today_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date = v_today  -- STRICT: Only policies with submit_date = today
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
    GROUP BY p.user_id
    HAVING COALESCE(SUM(p.annual_premium), 0) > 0
  ),

  -- Get WTD totals for those same agents - STRICT submit_date only
  wtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(p.id) AS wtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date >= v_week_start  -- STRICT: submit_date only
      AND p.submit_date <= v_today       -- STRICT: submit_date only
      AND (p_agency_id IS NULL OR p.agency_id IN (
        SELECT d.agency_id FROM get_agency_descendants(p_agency_id) d
      ))
      AND p.user_id IN (SELECT user_id FROM today_sales)
    GROUP BY p.user_id
  ),

  -- Get MTD totals for those same agents - STRICT submit_date only
  mtd_sales AS (
    SELECT
      p.user_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(p.id) AS mtd_policies
    FROM policies p
    WHERE p.imo_id = p_imo_id
      AND p.submit_date >= v_month_start  -- STRICT: submit_date only
      AND p.submit_date <= v_today        -- STRICT: submit_date only
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
STRICT submit_date filtering - NO created_at fallback.
NO STATUS FILTER - tracks AP purely by submit_date.
Used by Slack daily leaderboard. Only includes agents with sales today.
Uses America/New_York timezone. WTD starts on Monday (ISO week).
Fixed in migration 20260203111935 to resolve created_at bug.';
