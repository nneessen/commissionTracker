-- supabase/migrations/20260129125124_agency_leaderboard_recursive_hierarchy.sql
-- Fix: Agency leaderboard now includes FULL downward hierarchy, not just direct agents
--
-- Previously: Only counted agents where agency_id = X (flat, no hierarchy)
-- Now: Counts all agents in the entire hierarchy tree below the agency owner
--
-- This means for Self Made Financial (owned by Kerry Glass):
-- - Kerry Glass himself (if he has agent role)
-- - All agents whose hierarchy_path descends from Kerry's hierarchy_path
-- - This includes agents in sub-agencies (Agency A, B, C under Kerry)
--
-- Note: hierarchy_path is TEXT, so we use string pattern matching (not ltree operators)

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
      AND o.hierarchy_path IS NOT NULL  -- Owner must have hierarchy_path set
  ),

  -- For each agency, find ALL agents in the downward hierarchy
  -- Since hierarchy_path is TEXT (not ltree), we use string pattern matching:
  -- - Equal path = the owner themselves
  -- - Starts with owner_path + '.' = descendants
  -- This includes:
  -- 1. The agency owner themselves (equal paths)
  -- 2. Anyone whose hierarchy_path starts with owner's path followed by a dot
  agency_hierarchy_agents AS (
    SELECT DISTINCT
      aa.id AS agency_id,
      u.id AS user_id,
      u.recruiter_id
    FROM active_agencies aa
    INNER JOIN user_profiles u ON (
      -- User's path equals owner's path (the owner themselves)
      u.hierarchy_path = aa.owner_hierarchy_path
      -- OR user's path starts with owner's path + '.' (descendants)
      OR u.hierarchy_path LIKE aa.owner_hierarchy_path || '.%'
    )
    WHERE u.approval_status = 'approved'
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

  -- Count agents per agency (full hierarchy)
  agent_counts AS (
    SELECT
      aha.agency_id,
      COUNT(DISTINCT aha.user_id) AS agent_count
    FROM agency_hierarchy_agents aha
    GROUP BY aha.agency_id
  ),

  -- Calculate combined IP per agency (full hierarchy)
  -- IP = Active policies with paid advance commissions
  ip_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ip,
      COUNT(DISTINCT p.id) AS total_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    INNER JOIN commissions c ON c.policy_id = p.id
    WHERE p.status = 'active'
      AND c.status = 'paid'
      AND c.type = 'advance'
      AND c.payment_date IS NOT NULL
      AND c.payment_date::date >= p_start_date
      AND c.payment_date::date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- Calculate combined AP per agency (full hierarchy)
  -- AP = Pending policies that have been submitted
  ap_data AS (
    SELECT
      aha.agency_id,
      SUM(COALESCE(p.annual_premium, 0)) AS total_ap,
      COUNT(DISTINCT p.id) AS pending_policies
    FROM agency_hierarchy_agents aha
    INNER JOIN policies p ON p.user_id = aha.user_id
    WHERE p.status = 'pending'
      AND p.submit_date IS NOT NULL
      AND p.submit_date::date >= p_start_date
      AND p.submit_date::date <= p_end_date
    GROUP BY aha.agency_id
  ),

  -- Count prospects per agency (full hierarchy)
  -- Prospects recruited by any agent in the hierarchy
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

  -- Count pipeline recruits per agency (full hierarchy)
  -- Pipeline = recruits actively going through onboarding
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
    WHERE COALESCE(ac.agent_count, 0) > 0  -- Only show agencies with agents
  ),

  -- Add rankings (by IP total, then policy count, then name)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_agency_leaderboard_data(date, date) TO authenticated;

-- Add comment explaining the hierarchy logic
COMMENT ON FUNCTION get_agency_leaderboard_data IS
'Returns agency leaderboard data with FULL HIERARCHY aggregation.
Each agency''s metrics include all agents in the downward hierarchy tree from the agency owner.
Uses TEXT hierarchy_path with LIKE pattern matching to find all descendants.
Sub-agencies will show their own subset of metrics (not double-counted within their own row).';
