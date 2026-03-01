-- supabase/migrations/20260301104500_fix_ip_leaderboard_sunday_window.sql
-- Fix weekly IP reporting window:
-- - Mon-Sat runs should report previous completed Mon-Sun week
-- - Sunday runs should report current Mon-Sun week ending today
-- This prevents Sunday/manual runs from showing data from two weeks ago.

-- ============================================================================
-- get_ip_leaderboard_with_periods
-- ============================================================================
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
  v_weekday INTEGER;
  v_current_week_start DATE;
  v_week_end DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- AUTH: Skip for service_role (server-to-server calls like slack-ip-leaderboard)
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = p_imo_id
    ) THEN
      RAISE EXCEPTION 'Access denied: not a member of this IMO';
    END IF;
  END IF;

  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;
  v_weekday := EXTRACT(ISODOW FROM v_today); -- 1=Mon ... 7=Sun
  v_current_week_start := date_trunc('week', v_today)::DATE; -- Monday

  -- Reporting week window:
  -- Sunday -> current week (Mon..Sun=today)
  -- Mon-Sat -> previous completed week
  IF v_weekday = 7 THEN
    v_week_start := v_current_week_start;
    v_week_end := v_today;
  ELSE
    v_week_end := v_current_week_start - 1;
    v_week_start := v_week_end - 6;
  END IF;

  -- MTD = month containing report week end, up through report week end
  v_month_start := date_trunc('month', v_week_end)::DATE;

  RETURN QUERY
  WITH
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
AUTH: Verifies caller belongs to the requested IMO (bypassed for service_role).
Week window: Sunday runs use current Mon-Sun week ending today; Mon-Sat runs use previous completed Mon-Sun week.
MTD = month containing report week end through report week end.
IP = approved policies by effective_date. Uses America/New_York timezone.';

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_ip_leaderboard_with_periods', '20260301104500')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();

-- ============================================================================
-- get_agencies_ip_totals
-- ============================================================================
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
  v_weekday INTEGER;
  v_current_week_start DATE;
  v_week_end DATE;
  v_week_start DATE;
  v_month_start DATE;
BEGIN
  -- AUTH: Skip for service_role (server-to-server calls like slack-ip-leaderboard)
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = p_imo_id
    ) THEN
      RAISE EXCEPTION 'Access denied: not a member of this IMO';
    END IF;
  END IF;

  -- Calculate date boundaries in Eastern timezone
  v_today := (NOW() AT TIME ZONE 'America/New_York')::DATE;
  v_weekday := EXTRACT(ISODOW FROM v_today); -- 1=Mon ... 7=Sun
  v_current_week_start := date_trunc('week', v_today)::DATE; -- Monday

  -- Reporting week window:
  -- Sunday -> current week (Mon..Sun=today)
  -- Mon-Sat -> previous completed week
  IF v_weekday = 7 THEN
    v_week_start := v_current_week_start;
    v_week_end := v_today;
  ELSE
    v_week_end := v_current_week_start - 1;
    v_week_start := v_week_end - 6;
  END IF;

  -- MTD = month containing report week end, up through report week end
  v_month_start := date_trunc('month', v_week_end)::DATE;

  RETURN QUERY
  WITH
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
'Returns agency IP totals with WTD and MTD values.
AUTH: Verifies caller belongs to the requested IMO (bypassed for service_role).
Week window: Sunday runs use current Mon-Sun week ending today; Mon-Sat runs use previous completed Mon-Sun week.
MTD = month containing report week end through report week end.
IP = approved policies by effective_date. Uses America/New_York timezone.';

INSERT INTO supabase_migrations.function_versions (function_name, current_version)
VALUES ('get_agencies_ip_totals', '20260301104500')
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
