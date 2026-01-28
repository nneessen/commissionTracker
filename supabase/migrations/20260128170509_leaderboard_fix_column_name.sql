-- supabase/migrations/20260128170509_leaderboard_fix_column_name.sql
-- Fix: policies table uses submit_date, not submitted_date

-- Drop and recreate all three functions with the correct column name

-- ============================================================================
-- 1. Fix get_leaderboard_data - change submitted_date to submit_date
-- ============================================================================
DROP FUNCTION IF EXISTS get_leaderboard_data(date, date, text, uuid, integer);

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
  ip_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM policies p
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Calculate AP (Annual Premium) - policies with status='pending'
  -- Use submit_date (not submitted_date)
  ap_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM policies p
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Count prospects
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

  -- Count pipeline recruits
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
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM scoped_agents sa
    LEFT JOIN downline_counts dc ON dc.agent_id = sa.id
    LEFT JOIN ip_data ip ON ip.user_id = sa.id
    LEFT JOIN ap_data ap ON ap.user_id = sa.id
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
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agent_name ASC;
END;
$$;


-- ============================================================================
-- 2. Fix get_agency_leaderboard_data
-- ============================================================================
DROP FUNCTION IF EXISTS get_agency_leaderboard_data(date, date);

CREATE OR REPLACE FUNCTION get_agency_leaderboard_data(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  owner_id uuid,
  owner_name text,
  agent_count bigint,
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
  -- Get all active agencies
  active_agencies AS (
    SELECT
      a.id,
      a.name,
      a.owner_id
    FROM agencies a
    WHERE a.is_active = true
  ),

  -- Get all active agents per agency
  agency_agents AS (
    SELECT
      u.agency_id,
      u.id AS user_id,
      u.recruiter_id
    FROM user_profiles u
    WHERE u.agency_id IS NOT NULL
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

  -- Count agents per agency
  agent_counts AS (
    SELECT
      aa.agency_id,
      COUNT(DISTINCT aa.user_id) AS agent_count
    FROM agency_agents aa
    GROUP BY aa.agency_id
  ),

  -- Calculate combined IP per agency
  ip_data AS (
    SELECT
      aa.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM agency_agents aa
    INNER JOIN policies p ON p.user_id = aa.user_id
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY aa.agency_id
  ),

  -- Calculate combined AP per agency (use submit_date)
  ap_data AS (
    SELECT
      aa.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM agency_agents aa
    INNER JOIN policies p ON p.user_id = aa.user_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY aa.agency_id
  ),

  -- Count prospects per agency
  prospect_data AS (
    SELECT
      aa.agency_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM agency_agents aa
    INNER JOIN user_profiles r ON r.recruiter_id = aa.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY aa.agency_id
  ),

  -- Count pipeline recruits per agency
  pipeline_data AS (
    SELECT
      aa.agency_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM agency_agents aa
    INNER JOIN user_profiles r ON r.recruiter_id = aa.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY aa.agency_id
  ),

  -- Combine all data
  combined AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.owner_id,
      COALESCE(o.first_name || ' ' || o.last_name, o.email, 'Unknown') AS owner_name,
      COALESCE(ac.agent_count, 0) AS agent_count,
      COALESCE(ip.total_ip, 0) AS ip_total,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ip.total_policies, 0) AS policy_count,
      COALESCE(ap.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM active_agencies a
    LEFT JOIN user_profiles o ON o.id = a.owner_id
    LEFT JOIN agent_counts ac ON ac.agency_id = a.id
    LEFT JOIN ip_data ip ON ip.agency_id = a.id
    LEFT JOIN ap_data ap ON ap.agency_id = a.id
    LEFT JOIN prospect_data pr ON pr.agency_id = a.id
    LEFT JOIN pipeline_data pl ON pl.agency_id = a.id
    WHERE COALESCE(ac.agent_count, 0) > 0
  ),

  -- Add rankings
  ranked AS (
    SELECT
      c.*,
      DENSE_RANK() OVER (ORDER BY c.ip_total DESC, c.policy_count DESC, c.agency_name ASC) AS rank_overall
    FROM combined c
  )

  SELECT
    r.agency_id,
    r.agency_name,
    r.owner_id,
    r.owner_name,
    r.agent_count,
    r.ip_total,
    r.ap_total,
    r.policy_count,
    r.pending_policy_count,
    r.prospect_count,
    r.pipeline_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agency_name ASC;
END;
$$;


-- ============================================================================
-- 3. Fix get_team_leaderboard_data
-- ============================================================================
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
  -- Find team leaders (agents with N+ direct downlines)
  team_leaders AS (
    SELECT
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
      u.email,
      u.profile_photo_url,
      u.agency_id,
      COUNT(d.id) AS direct_downline_count
    FROM user_profiles u
    INNER JOIN user_profiles d ON d.upline_id = u.id
    WHERE u.approval_status = 'approved'
      AND u.archived_at IS NULL
      AND d.approval_status = 'approved'
      AND d.archived_at IS NULL
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_photo_url, u.agency_id
    HAVING COUNT(d.id) >= p_min_downlines
  ),

  -- Get all team members (leader + all their direct downlines)
  team_members AS (
    SELECT
      tl.id AS leader_id,
      tl.id AS member_id
    FROM team_leaders tl
    UNION ALL
    SELECT
      tl.id AS leader_id,
      d.id AS member_id
    FROM team_leaders tl
    INNER JOIN user_profiles d ON d.upline_id = tl.id
    WHERE d.approval_status = 'approved'
      AND d.archived_at IS NULL
  ),

  -- Count team size
  team_sizes AS (
    SELECT
      tm.leader_id,
      COUNT(DISTINCT tm.member_id) AS team_size
    FROM team_members tm
    GROUP BY tm.leader_id
  ),

  -- Calculate combined IP per team
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

  -- Calculate combined AP per team (use submit_date)
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

  -- Count prospects per team
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

  -- Count pipeline recruits per team
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
GRANT EXECUTE ON FUNCTION get_leaderboard_data(date, date, text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agency_leaderboard_data(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_leaderboard_data(date, date, integer) TO authenticated;
