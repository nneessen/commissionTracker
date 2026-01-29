-- supabase/migrations/20260129132352_team_leaderboard_recursive_hierarchy.sql
-- Fix: Team leaderboard now includes FULL downward hierarchy, not just direct downlines
--
-- Previously: Only counted leader + direct downlines (one level via upline_id)
-- Now: Counts leader + entire hierarchy tree below them (using hierarchy_path)
--
-- This makes Teams consistent with Agencies tab which also uses full hierarchy traversal.

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
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Find team leaders: agents with N+ people in their FULL hierarchy (not just direct)
  -- First, get all potential leaders with their hierarchy paths
  potential_leaders AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND u.hierarchy_path IS NOT NULL
      AND (
        u.roles @> ARRAY['agent']
        OR u.roles @> ARRAY['active_agent']
        OR u.is_admin = true
      )
      -- Exclude pure recruits
      AND NOT (
        u.roles @> ARRAY['recruit']
        AND NOT u.roles @> ARRAY['agent']
        AND NOT u.roles @> ARRAY['active_agent']
      )
  ),

  -- Count full hierarchy size for each potential leader
  hierarchy_counts AS (
    SELECT
      pl.id AS leader_id,
      COUNT(DISTINCT u.id) AS hierarchy_size
    FROM potential_leaders pl
    INNER JOIN user_profiles u ON (
      -- Include leader themselves
      u.id = pl.id
      -- OR anyone whose hierarchy_path descends from leader's path
      OR u.hierarchy_path LIKE pl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
    GROUP BY pl.id
  ),

  -- Filter to only leaders with enough people in hierarchy
  team_leaders AS (
    SELECT
      pl.id,
      pl.name,
      pl.email,
      pl.profile_photo_url,
      pl.agency_id,
      pl.hierarchy_path,
      hc.hierarchy_size
    FROM potential_leaders pl
    INNER JOIN hierarchy_counts hc ON hc.leader_id = pl.id
    WHERE hc.hierarchy_size >= p_min_downlines
  ),

  -- Get all team members (leader + FULL hierarchy below them)
  -- Uses hierarchy_path pattern matching for recursive descent
  team_members AS (
    SELECT DISTINCT
      tl.id AS leader_id,
      u.id AS member_id
    FROM team_leaders tl
    INNER JOIN user_profiles u ON (
      -- Leader themselves
      u.id = tl.id
      -- OR anyone whose hierarchy_path descends from leader's path
      OR u.hierarchy_path LIKE tl.hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
  ),

  -- Count team size (should match hierarchy_size but recalculated for consistency)
  team_sizes AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT tm.member_id) AS team_size
    FROM team_members tm
    GROUP BY tm.leader_id
  ),

  -- Calculate combined IP per team (full hierarchy)
  -- IP = Active policies with paid advance commissions
  ip_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Calculate combined AP per team (full hierarchy)
  -- AP = Pending policies that have been submitted
  ap_data AS (
    SELECT
      tm.leader_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM team_members tm
    INNER JOIN policies p ON p.user_id = tm.member_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY tm.leader_id
  ),

  -- Count prospects per team (full hierarchy)
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

  -- Count pipeline recruits per team (full hierarchy)
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

  -- Combine all data
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
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM team_leaders tl
    LEFT JOIN team_sizes ts ON ts.leader_id = tl.id
    LEFT JOIN ip_data ip ON ip.leader_id = tl.id
    LEFT JOIN ap_data ap ON ap.leader_id = tl.id
    LEFT JOIN prospect_data pr ON pr.leader_id = tl.id
    LEFT JOIN pipeline_data pl ON pl.leader_id = tl.id
  ),

  -- Add agency names and rankings
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(date, date, integer) TO authenticated;

-- Add comment explaining the hierarchy logic
COMMENT ON FUNCTION get_team_leaderboard_data IS
'Returns team leaderboard data with FULL HIERARCHY aggregation.
A "team" is defined as a leader + everyone in their downward hierarchy tree.
Team leaders are agents with at least p_min_downlines people in their hierarchy.
Uses TEXT hierarchy_path with LIKE pattern matching to find all descendants.
Consistent with get_agency_leaderboard_data which uses the same traversal logic.';
