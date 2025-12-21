-- =============================================================================
-- RPC Functions for IMO and Agency Metrics
-- =============================================================================
-- These replace multiple round-trip queries with single efficient calls
-- Also fixes the unbounded IN clause issue in getAgencyMetrics
-- =============================================================================

-- =============================================================================
-- 1. IMO Metrics RPC Function
-- =============================================================================
CREATE OR REPLACE FUNCTION get_imo_metrics(p_imo_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_agencies', (
      SELECT COUNT(*) FROM agencies
      WHERE imo_id = p_imo_id AND is_active = true
    ),
    'total_agents', (
      SELECT COUNT(*) FROM user_profiles
      WHERE imo_id = p_imo_id
    ),
    'active_agents', (
      SELECT COUNT(*) FROM user_profiles
      WHERE imo_id = p_imo_id AND approval_status = 'approved'
    ),
    'total_policies', (
      SELECT COUNT(*) FROM policies
      WHERE imo_id = p_imo_id
    ),
    'total_premium', (
      SELECT COALESCE(SUM(annual_premium), 0) FROM policies
      WHERE imo_id = p_imo_id
    ),
    'total_commissions', (
      SELECT COALESCE(SUM(amount), 0) FROM commissions
      WHERE imo_id = p_imo_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_metrics(UUID) TO authenticated;

COMMENT ON FUNCTION get_imo_metrics IS 'Returns aggregated metrics for an IMO in a single query. Requires is_imo_admin() or is_super_admin().';

-- =============================================================================
-- 2. Agency Metrics RPC Function
-- =============================================================================
-- This fixes the unbounded IN clause issue by using JOINs instead
CREATE OR REPLACE FUNCTION get_agency_metrics(p_agency_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_agents', (
      SELECT COUNT(*) FROM user_profiles
      WHERE agency_id = p_agency_id
    ),
    'active_agents', (
      SELECT COUNT(*) FROM user_profiles
      WHERE agency_id = p_agency_id AND approval_status = 'approved'
    ),
    'total_policies', (
      SELECT COUNT(*) FROM policies p
      JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = p_agency_id
    ),
    'total_premium', (
      SELECT COALESCE(SUM(p.annual_premium), 0) FROM policies p
      JOIN user_profiles up ON p.user_id = up.id
      WHERE up.agency_id = p_agency_id
    ),
    'total_commissions', (
      SELECT COALESCE(SUM(c.amount), 0) FROM commissions c
      JOIN user_profiles up ON c.user_id = up.id
      WHERE up.agency_id = p_agency_id
    ),
    'total_override_commissions', (
      SELECT COALESCE(SUM(oc.override_commission_amount), 0) FROM override_commissions oc
      JOIN user_profiles up ON oc.override_agent_id = up.id
      WHERE up.agency_id = p_agency_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_metrics(UUID) TO authenticated;

COMMENT ON FUNCTION get_agency_metrics IS 'Returns aggregated metrics for an agency in a single query using JOINs. Avoids unbounded IN clauses.';

-- =============================================================================
-- Summary
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Created: get_imo_metrics(UUID) RPC function';
  RAISE NOTICE 'Created: get_agency_metrics(UUID) RPC function';
END $$;
