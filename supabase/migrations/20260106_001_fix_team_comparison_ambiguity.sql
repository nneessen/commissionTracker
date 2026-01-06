-- supabase/migrations/20260106_001_fix_team_comparison_ambiguity.sql
-- Fix: Resolve "column reference 'new_premium' is ambiguous" error in get_team_comparison_report
--
-- Root Cause: PostgreSQL 17 has stricter name resolution for window functions when
-- RETURNS TABLE columns share names with CTE aliases. The deployed function uses a
-- single aggregate CTE pattern that causes ambiguity in the window function ORDER BY.
--
-- Solution: Use LATERAL subqueries with explicit aliasing to avoid name collisions
-- between RETURNS TABLE columns and internal CTE columns.

-- =====================================================
-- Drop and recreate get_team_comparison_report
-- =====================================================

DROP FUNCTION IF EXISTS get_team_comparison_report(date, date);

CREATE OR REPLACE FUNCTION get_team_comparison_report(
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  agent_count bigint,
  new_policies bigint,
  new_premium numeric,
  commissions_earned numeric,
  avg_premium_per_policy numeric,
  avg_premium_per_agent numeric,
  policies_lapsed bigint,
  retention_rate numeric,
  rank_by_premium integer,
  rank_by_policies integer,
  pct_of_imo_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_total_imo_premium numeric;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = '42501';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = '22023';
  END IF;

  -- Get total IMO premium for percentage calculation
  -- Using explicit variable to avoid any ambiguity
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.status = 'active'
    AND p.effective_date >= p_start_date
    AND p.effective_date <= p_end_date;

  RETURN QUERY
  WITH agency_metrics AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.code AS agency_code,
      COALESCE(owner.first_name || ' ' || owner.last_name, owner.email, 'No Owner') AS owner_name,
      -- Use explicit aliases with unique names to avoid any ambiguity
      COALESCE(agent_stats.agent_count, 0)::bigint AS metric_agent_count,
      COALESCE(policy_stats.policy_count, 0)::bigint AS metric_new_policies,
      COALESCE(policy_stats.premium_total, 0)::numeric AS metric_new_premium,
      COALESCE(commission_stats.commission_total, 0)::numeric AS metric_commissions,
      CASE
        WHEN COALESCE(policy_stats.policy_count, 0) > 0
        THEN ROUND(COALESCE(policy_stats.premium_total, 0) / policy_stats.policy_count, 2)
        ELSE 0
      END::numeric AS metric_avg_premium_per_policy,
      CASE
        WHEN COALESCE(agent_stats.agent_count, 0) > 0
        THEN ROUND(COALESCE(policy_stats.premium_total, 0) / agent_stats.agent_count, 2)
        ELSE 0
      END::numeric AS metric_avg_premium_per_agent,
      COALESCE(lapse_stats.lapsed_count, 0)::bigint AS metric_policies_lapsed,
      CASE
        WHEN (COALESCE(policy_stats.policy_count, 0) + COALESCE(lapse_stats.lapsed_count, 0)) > 0
        THEN ROUND(
          COALESCE(policy_stats.policy_count, 0)::numeric /
          (COALESCE(policy_stats.policy_count, 0) + COALESCE(lapse_stats.lapsed_count, 0)) * 100
        , 1)
        ELSE 100
      END::numeric AS metric_retention_rate
    FROM agencies a
    LEFT JOIN user_profiles owner ON a.owner_id = owner.id
    -- LATERAL subquery for agent count (avoids ambiguity)
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS agent_count
      FROM user_profiles up
      WHERE up.agency_id = a.id
        AND up.approval_status = 'approved'
        AND up.archived_at IS NULL
    ) agent_stats ON true
    -- LATERAL subquery for policy metrics (avoids ambiguity)
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS policy_count,
        SUM(p.annual_premium) AS premium_total
      FROM policies p
      INNER JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = a.id
        AND p.status = 'active'
        AND p.effective_date >= p_start_date
        AND p.effective_date <= p_end_date
    ) policy_stats ON true
    -- LATERAL subquery for lapse metrics (avoids ambiguity)
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS lapsed_count
      FROM policies p
      INNER JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = a.id
        AND p.status = 'lapsed'
        AND p.cancellation_date >= p_start_date
        AND p.cancellation_date <= p_end_date
    ) lapse_stats ON true
    -- LATERAL subquery for commission metrics (avoids ambiguity)
    LEFT JOIN LATERAL (
      SELECT SUM(c.earned_amount) AS commission_total
      FROM commissions c
      INNER JOIN user_profiles up ON c.user_id = up.id
      WHERE up.agency_id = a.id
        AND c.payment_date >= p_start_date
        AND c.payment_date <= p_end_date
    ) commission_stats ON true
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  )
  SELECT
    am.agency_id,
    am.agency_name,
    am.agency_code,
    am.owner_name,
    am.metric_agent_count AS agent_count,
    am.metric_new_policies AS new_policies,
    am.metric_new_premium AS new_premium,
    am.metric_commissions AS commissions_earned,
    am.metric_avg_premium_per_policy AS avg_premium_per_policy,
    am.metric_avg_premium_per_agent AS avg_premium_per_agent,
    am.metric_policies_lapsed AS policies_lapsed,
    am.metric_retention_rate AS retention_rate,
    -- Window functions now unambiguously reference CTE columns with metric_ prefix
    RANK() OVER (ORDER BY am.metric_new_premium DESC)::integer AS rank_by_premium,
    RANK() OVER (ORDER BY am.metric_new_policies DESC)::integer AS rank_by_policies,
    CASE
      WHEN v_total_imo_premium > 0
      THEN ROUND(am.metric_new_premium / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric AS pct_of_imo_premium
  FROM agency_metrics am
  ORDER BY am.metric_new_premium DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_comparison_report(date, date) TO authenticated;

COMMENT ON FUNCTION get_team_comparison_report(date, date) IS
'Returns agency comparison metrics for the current user''s IMO.
Includes rankings by premium and policies, retention rates, and percent of IMO production.
Requires IMO admin, IMO owner, or super admin role.

Fixed: Uses metric_ prefix for CTE columns to avoid ambiguity with RETURNS TABLE columns.';
