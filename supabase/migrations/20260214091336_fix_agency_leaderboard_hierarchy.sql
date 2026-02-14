-- supabase/migrations/20260214091336_fix_agency_leaderboard_hierarchy.sql
-- Fix agency leaderboard to use MLM hierarchy aggregation
--
-- Issue: Agencies should aggregate ALL downline agents via hierarchy_path,
--        not just direct agents by agency_id
--
-- Example: Self Made Financial should include all agents from sub-agencies
--          (1 of 1 Financial, Dynasty Group, Financial 41, The Standard)

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
SET statement_timeout = '10s'
AS $$
BEGIN
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
    WHERE a.is_active = true
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

  -- Agent counts per agency (including hierarchy)
  agent_counts AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT aha.user_id) AS agent_count
    FROM agency_hierarchy_agents aha
    GROUP BY aha.agency_id
  ),

  -- IP: APPROVED policies with effective_date in range
  ip_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.status = 'approved'
      AND p.effective_date IS NOT NULL
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- AP: ALL policies (any status) with submit_date in range - NO STATUS FILTER
  ap_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS submitted_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.submit_date IS NOT NULL
      AND p.submit_date >= p_start_date
      AND p.submit_date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- Separate count for pending policies (for display purposes)
  pending_data AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date >= p_start_date
      AND p.submit_date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- Prospects: recruits in 'prospect' status
  prospect_data AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT r.id) AS prospect_count
    FROM agency_hierarchy_agents aha
    INNER JOIN user_profiles r ON r.recruiter_id = aha.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND (
        r.onboarding_status = 'prospect'
        OR (r.onboarding_started_at IS NULL AND r.onboarding_status IS NULL)
      )
    GROUP BY aha.agency_id
  ),

  -- Pipeline: recruits in active onboarding statuses
  pipeline_data AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT r.id) AS pipeline_count
    FROM agency_hierarchy_agents aha
    INNER JOIN user_profiles r ON r.recruiter_id = aha.user_id
    WHERE r.roles @> ARRAY['recruit']
      AND r.onboarding_status IS NOT NULL
      AND r.onboarding_status NOT IN ('prospect', 'completed', 'dropped')
    GROUP BY aha.agency_id
  ),

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
      COALESCE(pd.pending_policies, 0) AS pending_policy_count,
      COALESCE(pr.prospect_count, 0) AS prospect_count,
      COALESCE(pl.pipeline_count, 0) AS pipeline_count
    FROM active_agencies a
    LEFT JOIN user_profiles o ON o.id = a.owner_id
    LEFT JOIN agent_counts ac ON ac.agency_id = a.id
    LEFT JOIN ip_data ip ON ip.agency_id = a.id
    LEFT JOIN ap_data ap ON ap.agency_id = a.id
    LEFT JOIN pending_data pd ON pd.agency_id = a.id
    LEFT JOIN prospect_data pr ON pr.agency_id = a.id
    LEFT JOIN pipeline_data pl ON pl.agency_id = a.id
    WHERE COALESCE(ac.agent_count, 0) > 0
  ),

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

GRANT EXECUTE ON FUNCTION get_agency_leaderboard_data(date, date) TO authenticated;

COMMENT ON FUNCTION get_agency_leaderboard_data IS 'Agency leaderboard with MLM hierarchy aggregation. IP = approved policies by effective_date. AP = ALL policies by submit_date. Includes all downline agents via hierarchy_path.';
