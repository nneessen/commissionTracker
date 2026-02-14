-- supabase/migrations/20260214091630_fix_team_leaderboard_hierarchy.sql
-- Fix team leaderboard to use full MLM hierarchy aggregation
--
-- Issue: Teams should include ALL downline agents via hierarchy_path,
--        not just direct downlines (upline_id)
--
-- Example: Kerry Glass has 82 hierarchy downlines, not just 13 direct downlines

DROP FUNCTION IF EXISTS get_team_leaderboard_data(date, date, integer);

CREATE OR REPLACE FUNCTION get_team_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_min_downlines integer DEFAULT 5
)
RETURNS TABLE (
  leader_id uuid,
  leader_name text,
  leader_email text,
  leader_profile_photo_url text,
  agency_id uuid,
  agency_name text,
  team_size bigint,
  ip_total numeric,
  ap_total numeric,
  policy_count bigint,
  pending_policy_count bigint,
  prospect_count bigint,
  pipeline_count bigint,
  rank_overall bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10s'
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get team leaders (agents with at least p_min_downlines direct reports)
  team_leaders AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path,
      COUNT(d.id) AS direct_downline_count
    FROM user_profiles u
    INNER JOIN user_profiles d ON d.upline_id = u.id
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND d.approval_status = 'approved'
      AND d.archived_at IS NULL
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_photo_url, u.agency_id, u.hierarchy_path
    HAVING COUNT(d.id) >= p_min_downlines
  ),

  -- Get ALL team members using hierarchy_path (leader + all downline agents)
  team_members AS (
    SELECT DISTINCT
      tl.id AS leader_id,
      u.id AS member_id
    FROM team_leaders tl
    INNER JOIN user_profiles u ON (
      u.hierarchy_path = tl.hierarchy_path
      OR u.hierarchy_path LIKE tl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
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

  -- Team sizes (including leader + all hierarchy downlines)
  team_sizes AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT tm.member_id) AS team_size
    FROM team_members tm
    GROUP BY tm.leader_id
  ),

  -- IP: APPROVED policies with effective_date in range
  ip_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- AP: ALL policies (any status) with submit_date in range - NO STATUS FILTER
  ap_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS submitted_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.submit_date IS NOT NULL
      AND p.submit_date >= p_start_date
      AND p.submit_date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Separate count for pending policies (for display purposes)
  pending_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date >= p_start_date
      AND p.submit_date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Prospects: recruits in 'prospect' status
  prospect_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY tm.leader_id
  ),

  -- Pipeline: recruits in active onboarding statuses
  pipeline_data AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM team_members tm
    INNER JOIN user_profiles r ON r.recruiter_id = tm.member_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY tm.leader_id
  ),

  combined AS (
    SELECT
      tl.id AS leader_id,
      tl.name AS leader_name,
      tl.email AS leader_email,
      tl.profile_photo_url AS leader_profile_photo_url,
      tl.agency_id,
      COALESCE(ts.team_size, 1) AS team_size,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(pd.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM team_leaders tl
    LEFT JOIN team_sizes ts ON ts.leader_id = tl.id
    LEFT JOIN ip_data ip ON ip.leader_id = tl.id
    LEFT JOIN ap_data ap ON ap.leader_id = tl.id
    LEFT JOIN pending_data pd ON pd.leader_id = tl.id
    LEFT JOIN prospect_data pr ON pr.leader_id = tl.id
    LEFT JOIN pipeline_data pl ON pl.leader_id = tl.id
  ),

  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.leader_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.leader_id,
    r.leader_name,
    r.leader_email,
    r.leader_profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.team_size,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.leader_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(date, date, integer) TO authenticated;

COMMENT ON FUNCTION get_team_leaderboard_data IS 'Team leaderboard with full MLM hierarchy aggregation. IP = approved policies by effective_date. AP = ALL policies by submit_date. Includes all downline team members via hierarchy_path.';
