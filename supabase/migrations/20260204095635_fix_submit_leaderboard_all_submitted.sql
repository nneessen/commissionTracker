-- supabase/migrations/20260204095635_fix_submit_leaderboard_all_submitted.sql
-- Fix Submit Leaderboard to count ALL submitted policies regardless of status
--
-- The Submit page shows policies that were SUBMITTED in the date range
-- Status doesn't matter - if it has a submit_date in range, it counts

DROP FUNCTION IF EXISTS get_submit_leaderboard(date, date);

CREATE OR REPLACE FUNCTION get_submit_leaderboard(
  p_start_date date DEFAULT date_trunc('month', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  profile_photo_url text,
  agency_id uuid,
  agency_name text,
  ap_total numeric,
  policy_count bigint,
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
      u.agency_id
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

  -- Calculate AP (Annual Premium) for ALL policies submitted in date range
  -- No status filter - if it was submitted in the range, it counts
  ap_data AS (
    SELECT
      p.user_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS total_policies
    FROM policies p
    WHERE p.submit_date >= p_start_date
      AND p.submit_date <= p_end_date
    GROUP BY p.user_id
  ),

  -- Combine agent data with AP data (only agents with submissions)
  combined AS (
    SELECT
      aa.id AS agent_id,
      aa.name AS agent_name,
      aa.email AS agent_email,
      aa.profile_photo_url,
      aa.agency_id,
      COALESCE(ap.total_ap, 0) AS ap_total,
      COALESCE(ap.total_policies, 0) AS policy_count
    FROM active_agents aa
    INNER JOIN ap_data ap ON ap.user_id = aa.id
    WHERE ap.total_ap > 0
  ),

  -- Add agency names and rankings
  ranked AS (
    SELECT
      c.*,
      ag.name AS agency_name,
      DENSE_RANK() OVER (ORDER BY c.ap_total DESC, c.policy_count DESC, c.agent_name ASC) AS rank_overall
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
    r.ap_total,
    r.policy_count,
    r.rank_overall
  FROM ranked r
  ORDER BY r.rank_overall ASC, r.agent_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_submit_leaderboard(date, date) TO authenticated;

COMMENT ON FUNCTION get_submit_leaderboard(date, date) IS
'Returns leaderboard data for ALL policies submitted within date range.
No status filter - counts any policy with submit_date in range.
Ranks by total annual premium submitted.';
