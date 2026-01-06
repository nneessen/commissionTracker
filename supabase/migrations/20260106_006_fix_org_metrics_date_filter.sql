-- supabase/migrations/20260106_006_fix_org_metrics_date_filter.sql
-- Fix: Correct date filtering logic in get_imo_override_summary
-- Fix: Add database indexes for date columns used in filtering

-- =====================================================
-- 1. Fix get_imo_override_summary date filtering bug
-- The original implementation had incorrect logic that would include
-- ALL overrides when oc.id IS NULL, instead of returning zero counts.
-- =====================================================

DROP FUNCTION IF EXISTS get_imo_override_summary(date, date);

CREATE OR REPLACE FUNCTION get_imo_override_summary(
  p_start_date date DEFAULT date_trunc('year', CURRENT_DATE)::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  imo_id uuid,
  imo_name text,
  total_override_count bigint,
  total_override_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  chargeback_amount numeric,
  unique_uplines bigint,
  unique_downlines bigint,
  avg_override_per_policy numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_is_imo_admin boolean;
BEGIN
  -- Get user's IMO and verify access
  SELECT up.imo_id INTO v_imo_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not assigned to an IMO'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check if user is IMO admin
  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  -- Use CTE pattern (matching get_agency_override_summary) for correct date filtering
  RETURN QUERY
  WITH filtered_overrides AS (
    SELECT oc.*
    FROM override_commissions oc
    INNER JOIN policies p ON oc.policy_id = p.id
    WHERE oc.imo_id = v_imo_id
      AND p.effective_date >= p_start_date
      AND p.effective_date <= p_end_date
  )
  SELECT
    i.id AS imo_id,
    i.name AS imo_name,
    COUNT(fo.id) AS total_override_count,
    COALESCE(SUM(fo.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'pending' THEN fo.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'earned' THEN fo.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN fo.status = 'paid' THEN fo.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(fo.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT fo.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT fo.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT fo.policy_id) > 0
      THEN ROUND(SUM(fo.override_commission_amount) / COUNT(DISTINCT fo.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy
  FROM imos i
  LEFT JOIN filtered_overrides fo ON fo.imo_id = i.id
  WHERE i.id = v_imo_id
  GROUP BY i.id, i.name;
END;
$$;

COMMENT ON FUNCTION get_imo_override_summary(date, date) IS
  'Returns override commission summary for IMO admins.
Accepts optional date range for filtering by policy effective date.
Defaults to YTD if no dates provided.';

GRANT EXECUTE ON FUNCTION get_imo_override_summary(date, date) TO authenticated;

-- =====================================================
-- 2. Add indexes for date columns if they don't exist
-- These optimize the date-range filtering in RPC functions
-- =====================================================

-- Index for policies.effective_date (used in all 5 RPC functions)
CREATE INDEX IF NOT EXISTS idx_policies_effective_date
ON policies(effective_date)
WHERE status = 'active';

-- Index for commissions.payment_date (used in dashboard metrics)
CREATE INDEX IF NOT EXISTS idx_commissions_payment_date
ON commissions(payment_date);

-- Composite index for policies with imo_id + effective_date
-- Optimizes get_imo_dashboard_metrics and get_imo_production_by_agency
CREATE INDEX IF NOT EXISTS idx_policies_imo_effective_date
ON policies(imo_id, effective_date)
WHERE status = 'active';

-- =====================================================
-- 3. Add comments for documentation
-- =====================================================

COMMENT ON INDEX idx_policies_effective_date IS
  'Optimizes date-range filtering on active policies';

COMMENT ON INDEX idx_commissions_payment_date IS
  'Optimizes date-range filtering on commission payments';

COMMENT ON INDEX idx_policies_imo_effective_date IS
  'Optimizes IMO-level date-range filtering on active policies';
