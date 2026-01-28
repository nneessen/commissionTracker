-- supabase/migrations/20260128163807_leaderboard_rpc.sql
-- Leaderboard RPC functions for IP (Issued Premium) calculations
-- IP = sum of annual_premium where policy.status = 'active' AND commission.status = 'paid'

-- Function: get_leaderboard_data
-- Returns leaderboard data with IP, policy counts, and recruiting metrics
-- Filtered by date range and scope (all, agency, team)
CREATE OR REPLACE FUNCTION get_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE,
  p_scope text DEFAULT 'all',
  p_scope_id uuid DEFAULT NULL,
  p_team_threshold integer DEFAULT 5
)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  profile_photo_url text,
  agency_id uuid,
  agency_name text,
  direct_downline_count bigint,
  ip_total numeric,
  policy_count bigint,
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
  -- Get all active agents (not recruits, not archived)
  active_agents AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      u.hierarchy_path,
      u.upline_id
    FROM user_profiles u
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
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

  -- Scope filtering
  scoped_agents AS (
    SELECT a.*
    FROM active_agents a
    WHERE
      CASE
        WHEN p_scope = 'all' THEN true
        WHEN p_scope = 'agency' AND p_scope_id IS NOT NULL THEN a.agency_id = p_scope_id
        WHEN p_scope = 'team' AND p_scope_id IS NOT NULL THEN
          -- Include team leader and their downlines
          a.id = p_scope_id
          OR a.hierarchy_path LIKE (p_scope_id::text || '.%')
          OR a.upline_id = p_scope_id
        ELSE true
      END
  ),

  -- Count direct downlines for each agent
  downline_counts AS (
    SELECT
      u.upline_id AS agent_id,
      COUNT(*) AS downline_count
    FROM user_profiles u
    WHERE u.upline_id IS NOT NULL
      AND u.approval_status = 'approved'
      AND u.archived_at IS NULL
    GROUP BY u.upline_id
  ),

  -- Calculate IP (Issued Premium) - policies with status='active' AND commission status='paid'
  -- Filtered by commission payment_date within the date range
  ip_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM policies p
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'  -- Only count the main advance commission, not renewals
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Count prospects (not yet enrolled in pipeline)
  prospect_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS prospect_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND (
        u.onboarding_status = 'prospect'
        OR (u.onboarding_started_at IS NULL AND u.onboarding_status IS NULL)
      )
    GROUP BY u.recruiter_id
  ),

  -- Count pipeline recruits (actively in a pipeline phase)
  pipeline_data AS (
    SELECT
      u.recruiter_id,
      COUNT(*) AS pipeline_count
    FROM user_profiles u
    WHERE u.recruiter_id IS NOT NULL
      AND u.roles @> ARRAY['recruit']
      AND u.onboarding_status IS NOT NULL
      AND u.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY u.recruiter_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      sa.id AS agent_id,
      sa.name AS agent_name,
      sa.email AS agent_email,
      sa.profile_photo_url,
      sa.agency_id,
      COALESCE(dc.downline_count, 0) AS direct_downline_count,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM scoped_agents sa
    LEFT JOIN downline_counts dc ON dc.agent_id = sa.id
    LEFT JOIN ip_data ip ON ip.user_id = sa.id
    LEFT JOIN prospect_data pr ON pr.recruiter_id = sa.id
    LEFT JOIN pipeline_data pl ON pl.recruiter_id = sa.id
  ),

  -- Add agency names and rankings
  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.agent_name ASC) AS rank_overall
    FROM combined c
    LEFT JOIN agencies ag ON ag.id = c.agency_id
  )

  SELECT
    r.agent_id,
    r.agent_name,
    r.agent_email,
    r.profile_photo_url,
    r.agency_id,
    r.agency_name,
    r.direct_downline_count,
    r.ip_total,
    r.policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agent_name ASC;
END;
$$;

-- Function: get_team_leaders_for_leaderboard
-- Returns agents with N+ direct downlines for the team filter dropdown
CREATE OR REPLACE FUNCTION get_team_leaders_for_leaderboard(
  p_min_downlines integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  downline_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
    COUNT(d.id) AS downline_count
  FROM user_profiles u
  INNER JOIN user_profiles d ON d.upline_id = u.id
  WHERE u.approval_status = 'approved'
    AND u.archived_at IS NULL
    AND d.approval_status = 'approved'
    AND d.archived_at IS NULL
  GROUP BY u.id, u.first_name, u.last_name, u.email
  HAVING COUNT(d.id) >= p_min_downlines
  ORDER BY downline_count DESC, name ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_leaderboard_data(date, date, text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_leaders_for_leaderboard(integer) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_leaderboard_data IS 'Returns leaderboard data with IP (Issued Premium - active policies with paid commissions), policy counts, and recruiting metrics. Supports filtering by date range and scope (all/agency/team).';
COMMENT ON FUNCTION get_team_leaders_for_leaderboard IS 'Returns agents with N+ direct downlines for the team filter dropdown in the leaderboard.';
