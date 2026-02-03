-- supabase/migrations/20260202191101_fix_agency_submit_totals_hierarchy.sql
-- Fix: Agency submit totals now include FULL downward hierarchy (MLM structure)
--
-- Previously: Only counted policies where p.agency_id = agency.id (flat, no hierarchy)
-- Now: Counts all policies from agents in the entire hierarchy tree below the agency owner
--
-- This means for Self Made Financial (parent of Ten Toes Down, 1 of 1 Financial, The Standard):
-- - Self Made Financial's totals INCLUDE all sub-agency totals
-- - Each sub-agency shows their own subset (not double-counted within their own row)
--
-- Uses same hierarchy pattern as get_agency_leaderboard_data (hierarchy_path TEXT matching)

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
      AND o.hierarchy_path IS NOT NULL  -- Owner must have hierarchy_path set
  ),

  -- For each agency, find ALL agents in the downward hierarchy
  -- Since hierarchy_path is TEXT (not ltree), we use string pattern matching:
  -- - Equal path = the owner themselves
  -- - Starts with owner_path + '.' = descendants
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      -- User's path equals owner's path (the owner themselves)
      u.hierarchy_path = aa.owner_hierarchy_path
      -- OR user's path starts with owner's path + '.' (descendants)
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
      -- Exclude pure recruits (have recruit role but NOT agent/active_agent)
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- WTD totals per agency (using hierarchy-based agent list)
  wtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS wtd_ap,
      COUNT(DISTINCT p.id) AS wtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_week_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
    GROUP BY aha.agency_id
  ),

  -- MTD totals per agency (using hierarchy-based agent list)
  mtd_totals AS (
    SELECT
      aha.agency_id,
      COALESCE(SUM(p.annual_premium), 0) AS mtd_ap,
      COUNT(DISTINCT p.id) AS mtd_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.imo_id = p_imo_id
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) >= v_month_start
      AND COALESCE(p.submit_date, (p.created_at AT TIME ZONE 'America/New_York')::DATE) <= v_today
      AND p.status IN ('active', 'pending', 'approved')
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_agencies_submit_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_agencies_submit_totals(UUID) TO service_role;

COMMENT ON FUNCTION get_all_agencies_submit_totals(UUID) IS
'Returns WTD and MTD submit totals for ALL active agencies in the IMO with FULL HIERARCHY aggregation.
Each agency''s metrics include all agents in the downward hierarchy tree from the agency owner.
Self Made Financial (parent) will include totals from Ten Toes Down, 1 of 1 Financial, The Standard, etc.
Uses TEXT hierarchy_path with LIKE pattern matching to find all descendants.
Uses America/New_York timezone. WTD starts on Monday (ISO week).
Ordered by MTD AP descending for ranking display.';
