-- supabase/migrations/20260115_001_fix_agency_metrics_hierarchy.sql
-- Fix: Agency dashboard metrics should use hierarchy traversal for team AP calculation
--
-- Problem: Current implementation uses flat agency_id lookup which misses nested downlines
-- Solution: Use hierarchy_path to find all users in the agency owner's downline tree

-- =====================================================
-- Drop and recreate get_agency_dashboard_metrics with hierarchy support
-- =====================================================

DROP FUNCTION IF EXISTS get_agency_dashboard_metrics(uuid, date, date);

CREATE OR REPLACE FUNCTION get_agency_dashboard_metrics(
  p_agency_id uuid DEFAULT NULL,
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  imo_id uuid,
  active_policies bigint,
  total_annual_premium numeric,
  total_commissions_ytd numeric,
  total_earned_ytd numeric,
  total_unearned numeric,
  agent_count bigint,
  avg_production_per_agent numeric,
  top_producer_id uuid,
  top_producer_name text,
  top_producer_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
  v_owner_id uuid;
  v_owner_hierarchy_path text;
BEGIN
  -- Determine which agency to query
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    -- Default to user's own agency
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency';
  END IF;

  -- Get the IMO and owner for this agency
  SELECT a.imo_id, a.owner_id INTO v_imo_id, v_owner_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Get the owner's hierarchy_path for recursive team lookup
  SELECT COALESCE(up.hierarchy_path, up.id::text) INTO v_owner_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_owner_id;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check: must be agency owner, IMO admin (same IMO), or super admin
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin';
  END IF;

  RETURN QUERY
  WITH team_members AS (
    -- Find all users in the agency owner's downline hierarchy
    -- For MLM structures, team membership is defined by hierarchy_path, NOT agency_id
    -- This includes:
    -- 1. The agency owner themselves
    -- 2. All users whose hierarchy_path starts with the owner's path (recursive downlines)
    -- Note: We do NOT filter by agency_id because:
    --   - Downlines may not have agency_id set yet
    --   - In MLM, hierarchy defines team membership, not organizational assignment
    SELECT up.id
    FROM user_profiles up
    WHERE up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = v_owner_id  -- The owner
        OR up.hierarchy_path LIKE v_owner_hierarchy_path || '.%'  -- All descendants
      )
  )
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    a.imo_id,
    COALESCE(policy_stats.active_policies, 0)::bigint as active_policies,
    COALESCE(policy_stats.total_annual_premium, 0)::numeric as total_annual_premium,
    COALESCE(commission_stats.total_commissions_ytd, 0)::numeric as total_commissions_ytd,
    COALESCE(commission_stats.total_earned_ytd, 0)::numeric as total_earned_ytd,
    COALESCE(commission_stats.total_unearned, 0)::numeric as total_unearned,
    COALESCE(user_stats.agent_count, 0)::bigint as agent_count,
    CASE
      WHEN COALESCE(user_stats.agent_count, 0) > 0
      THEN ROUND(COALESCE(policy_stats.total_annual_premium, 0) / user_stats.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent,
    top_producer.user_id as top_producer_id,
    top_producer.producer_name as top_producer_name,
    COALESCE(top_producer.total_premium, 0)::numeric as top_producer_premium
  FROM agencies a
  -- Policy stats: now uses hierarchy-based team lookup
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (
        WHERE p.status = 'active'
          AND p.effective_date >= p_start_date
          AND p.effective_date <= p_end_date
      ) as active_policies,
      SUM(p.annual_premium) FILTER (
        WHERE p.status = 'active'
          AND p.effective_date >= p_start_date
          AND p.effective_date <= p_end_date
      ) as total_annual_premium
    FROM policies p
    WHERE p.user_id IN (SELECT tm.id FROM team_members tm)
  ) policy_stats ON true
  -- Commission stats: now uses hierarchy-based team lookup
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (
        WHERE c.payment_date >= p_start_date
          AND c.payment_date <= p_end_date
      ) as total_commissions_ytd,
      SUM(c.earned_amount) FILTER (
        WHERE c.payment_date >= p_start_date
          AND c.payment_date <= p_end_date
      ) as total_earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    WHERE c.user_id IN (SELECT tm.id FROM team_members tm)
  ) commission_stats ON true
  -- Agent count: uses the pre-filtered team_members CTE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agent_count
    FROM team_members
  ) user_stats ON true
  -- Top producer: now uses hierarchy-based team lookup
  LEFT JOIN LATERAL (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      SUM(p.annual_premium) as total_premium
    FROM user_profiles up
    INNER JOIN policies p ON p.user_id = up.id
    WHERE up.id IN (SELECT tm.id FROM team_members tm)
      AND p.status = 'active'
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
    GROUP BY up.id, up.first_name, up.last_name, up.email
    ORDER BY total_premium DESC NULLS LAST
    LIMIT 1
  ) top_producer ON true
  WHERE a.id = v_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_dashboard_metrics(uuid, date, date) TO authenticated;

COMMENT ON FUNCTION get_agency_dashboard_metrics(uuid, date, date) IS
'Returns aggregated dashboard metrics for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Accepts optional date range for filtering policies and commissions.
Defaults to YTD if no dates provided.

UPDATED 2026-01-15: Now uses hierarchy_path to recursively include all downlines
in the agency owner''s team, not just flat agency_id membership. This properly
supports MLM team structures where downlines can have their own downlines.

Requires agency owner, IMO admin (same IMO), or super admin role.';
