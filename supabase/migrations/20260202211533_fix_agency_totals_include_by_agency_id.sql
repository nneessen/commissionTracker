-- supabase/migrations/20260202211533_fix_agency_totals_include_by_agency_id.sql
-- Fix: Slack WTD Total Less Than Daily Total Bug
--
-- Root cause: get_all_agencies_submit_totals() scopes agents by hierarchy_path,
-- but get_slack_leaderboard_with_periods() scopes by policy.agency_id.
-- When an agent has a disconnected hierarchy_path (e.g., Conrad Seaman),
-- their policies show in today's leaderboard but NOT in WTD.
--
-- Solution: Add ONE condition to include agents whose agency_id is a descendant,
-- even if their hierarchy_path is disconnected. This is ADDITIVE ONLY.

-- ============================================================================
-- Function 1: get_all_agencies_submit_totals (with MLM hierarchy) - FIXED
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
  -- FIX: Also include agents whose agency_id is a descendant (catches disconnected hierarchy_path)
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      -- Original conditions: match by hierarchy_path
      u.hierarchy_path = aa.owner_hierarchy_path
      OR u.hierarchy_path LIKE aa.owner_hierarchy_path || '.%'
      -- FIX: Also include if user's agency_id is a descendant of this agency
      -- This catches agents like Conrad whose hierarchy_path is disconnected
      -- but agency_id correctly points to a sub-agency
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
FIX: Also includes agents whose agency_id is a descendant (catches disconnected hierarchy_path).
Uses America/New_York timezone. WTD starts on Monday (ISO week).';
