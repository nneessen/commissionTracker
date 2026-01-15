-- supabase/migrations/20260115_003_revert_imo_production_by_agency.sql
-- REVERT: get_imo_production_by_agency should use agency_id (organizational), NOT hierarchy
--
-- The hierarchy-based approach was WRONG for this function because:
-- 1. "Production by Agency" is an organizational breakdown (disjoint groups)
-- 2. Hierarchy trees OVERLAP (Kerry's tree includes Nick's entire team)
-- 3. Using hierarchy causes massive double-counting
--
-- Hierarchy-based is correct for:
-- - get_agency_dashboard_metrics (owner sees their team's total)
-- - get_agency_override_summary (owner sees their team's overrides)
--
-- But agency_id is correct for:
-- - get_imo_production_by_agency (IMO admin sees breakdown BY organization)

DROP FUNCTION IF EXISTS get_imo_production_by_agency(date, date);

CREATE OR REPLACE FUNCTION get_imo_production_by_agency(
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  active_policies bigint,
  total_annual_premium numeric,
  commissions_ytd numeric,
  agent_count bigint,
  avg_production numeric,
  pct_of_imo_production numeric
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
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO';
  END IF;

  -- Get total IMO premium for percentage calculation (filtered by date range)
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.status = 'active'
    AND p.effective_date >= p_start_date
    AND p.effective_date <= p_end_date;

  RETURN QUERY
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    a.code as agency_code,
    COALESCE(owner.first_name || ' ' || owner.last_name, owner.email, 'No Owner') as owner_name,
    COALESCE(policy_stats.active_policies, 0)::bigint as active_policies,
    COALESCE(policy_stats.total_premium, 0)::numeric as total_annual_premium,
    COALESCE(commission_stats.commissions_ytd, 0)::numeric as commissions_ytd,
    COALESCE(user_stats.agent_count, 0)::bigint as agent_count,
    CASE
      WHEN COALESCE(user_stats.agent_count, 0) > 0
      THEN ROUND(COALESCE(policy_stats.total_premium, 0) / user_stats.agent_count, 2)
      ELSE 0
    END::numeric as avg_production,
    CASE
      WHEN v_total_imo_premium > 0
      THEN ROUND(COALESCE(policy_stats.total_premium, 0) / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric as pct_of_imo_production
  FROM agencies a
  LEFT JOIN user_profiles owner ON a.owner_id = owner.id
  -- Policy stats: Use agency_id (organizational, disjoint)
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
      ) as total_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = a.id
  ) policy_stats ON true
  -- Commission stats: Use agency_id (organizational, disjoint)
  LEFT JOIN LATERAL (
    SELECT SUM(c.amount) as commissions_ytd
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = a.id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
  ) commission_stats ON true
  -- Agent count: Use agency_id (organizational, disjoint)
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.agency_id = a.id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ) user_stats ON true
  WHERE a.imo_id = v_imo_id
    AND a.is_active = true
  ORDER BY COALESCE(policy_stats.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency(date, date) TO authenticated;

COMMENT ON FUNCTION get_imo_production_by_agency(date, date) IS
'Returns production breakdown by agency for the current user''s IMO.
Uses agency_id for organizational breakdown (disjoint groups, no overlap).
This is different from get_agency_dashboard_metrics which uses hierarchy
for team totals. Requires IMO admin, IMO owner, or super admin role.';
