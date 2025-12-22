-- Migration: IMO/Agency Dashboard Metrics
-- Phase 5 of org-awareness implementation
-- Provides aggregated dashboard metrics for IMO admins and agency owners

-- =====================================================
-- IMO Dashboard Metrics
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_imo_dashboard_metrics();
DROP FUNCTION IF EXISTS get_agency_dashboard_metrics(uuid);
DROP FUNCTION IF EXISTS get_imo_production_by_agency();
DROP FUNCTION IF EXISTS get_agency_production_by_agent(uuid);

-- Returns aggregated metrics for the current user's IMO
-- Only accessible to IMO admins, IMO owners, and super admins
CREATE OR REPLACE FUNCTION get_imo_dashboard_metrics()
RETURNS TABLE (
  imo_id uuid,
  imo_name text,
  total_active_policies bigint,
  total_annual_premium numeric,
  total_commissions_ytd numeric,
  total_earned_ytd numeric,
  total_unearned numeric,
  agent_count bigint,
  agency_count bigint,
  avg_production_per_agent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_imo_id uuid;
  v_year_start date;
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

  -- Calculate year start for YTD metrics
  v_year_start := date_trunc('year', CURRENT_DATE)::date;

  RETURN QUERY
  SELECT
    i.id as imo_id,
    i.name as imo_name,
    COALESCE(policy_stats.active_policies, 0)::bigint as total_active_policies,
    COALESCE(policy_stats.total_annual_premium, 0)::numeric as total_annual_premium,
    COALESCE(commission_stats.total_commissions_ytd, 0)::numeric as total_commissions_ytd,
    COALESCE(commission_stats.total_earned_ytd, 0)::numeric as total_earned_ytd,
    COALESCE(commission_stats.total_unearned, 0)::numeric as total_unearned,
    COALESCE(user_stats.agent_count, 0)::bigint as agent_count,
    COALESCE(agency_stats.agency_count, 0)::bigint as agency_count,
    CASE
      WHEN COALESCE(user_stats.agent_count, 0) > 0
      THEN ROUND(COALESCE(policy_stats.total_annual_premium, 0) / user_stats.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent
  FROM imos i
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_annual_premium
    FROM policies p
    WHERE p.imo_id = i.id
  ) policy_stats ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start) as total_commissions_ytd,
      SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start) as total_earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    WHERE c.imo_id = i.id
  ) commission_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.imo_id = i.id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ) user_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agency_count
    FROM agencies a
    WHERE a.imo_id = i.id
      AND a.is_active = true
  ) agency_stats ON true
  WHERE i.id = v_imo_id;
END;
$$;

-- Grant execute to authenticated users (function has internal access check)
GRANT EXECUTE ON FUNCTION get_imo_dashboard_metrics() TO authenticated;

COMMENT ON FUNCTION get_imo_dashboard_metrics() IS
'Returns aggregated dashboard metrics for the current user''s IMO.
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- Agency Dashboard Metrics
-- =====================================================

-- Returns aggregated metrics for a specific agency
-- Accessible to: agency owner, IMO admins (same IMO), super admins
CREATE OR REPLACE FUNCTION get_agency_dashboard_metrics(p_agency_id uuid DEFAULT NULL)
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
  v_year_start date;
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

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check: must be agency owner, IMO admin (same IMO), or super admin
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin';
  END IF;

  -- Calculate year start for YTD metrics
  v_year_start := date_trunc('year', CURRENT_DATE)::date;

  RETURN QUERY
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
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_annual_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = a.id
  ) policy_stats ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start) as total_commissions_ytd,
      SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start) as total_earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = a.id
  ) commission_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.agency_id = a.id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ) user_stats ON true
  LEFT JOIN LATERAL (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      SUM(p.annual_premium) as total_premium
    FROM user_profiles up
    INNER JOIN policies p ON p.user_id = up.id
    WHERE up.agency_id = a.id
      AND p.status = 'active'
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
    GROUP BY up.id, up.first_name, up.last_name, up.email
    ORDER BY total_premium DESC NULLS LAST
    LIMIT 1
  ) top_producer ON true
  WHERE a.id = v_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_dashboard_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION get_agency_dashboard_metrics(uuid) IS
'Returns aggregated dashboard metrics for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Requires agency owner, IMO admin (same IMO), or super admin role.';


-- =====================================================
-- IMO Production by Agency Breakdown
-- =====================================================

-- Returns production breakdown by agency for an IMO
-- Only accessible to IMO admins, IMO owners, and super admins
CREATE OR REPLACE FUNCTION get_imo_production_by_agency()
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
  v_year_start date;
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

  -- Calculate year start for YTD metrics
  v_year_start := date_trunc('year', CURRENT_DATE)::date;

  -- Get total IMO premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id AND p.status = 'active';

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
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_premium
    FROM policies p
    INNER JOIN user_profiles up ON p.user_id = up.id
    WHERE up.agency_id = a.id
  ) policy_stats ON true
  LEFT JOIN LATERAL (
    SELECT SUM(c.amount) as commissions_ytd
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = a.id
      AND c.payment_date >= v_year_start
  ) commission_stats ON true
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

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency() TO authenticated;

COMMENT ON FUNCTION get_imo_production_by_agency() IS
'Returns production breakdown by agency for the current user''s IMO.
Requires IMO admin, IMO owner, or super admin role.';


-- =====================================================
-- Agency Production by Agent Breakdown
-- =====================================================

-- Returns production breakdown by agent for an agency
-- Accessible to: agency owner, IMO admins (same IMO), super admins
CREATE OR REPLACE FUNCTION get_agency_production_by_agent(p_agency_id uuid DEFAULT NULL)
RETURNS TABLE (
  agent_id uuid,
  agent_name text,
  agent_email text,
  contract_level integer,
  active_policies bigint,
  total_annual_premium numeric,
  commissions_ytd numeric,
  earned_ytd numeric,
  unearned_amount numeric,
  pct_of_agency_production numeric,
  joined_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
  v_year_start date;
  v_total_agency_premium numeric;
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

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check: must be agency owner, IMO admin (same IMO), or super admin
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin';
  END IF;

  -- Calculate year start for YTD metrics
  v_year_start := date_trunc('year', CURRENT_DATE)::date;

  -- Get total agency premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_agency_premium
  FROM policies p
  INNER JOIN user_profiles up ON p.user_id = up.id
  WHERE up.agency_id = v_agency_id AND p.status = 'active';

  RETURN QUERY
  SELECT
    up.id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name,
    up.email as agent_email,
    up.contract_level,
    COALESCE(policy_stats.active_policies, 0)::bigint as active_policies,
    COALESCE(policy_stats.total_premium, 0)::numeric as total_annual_premium,
    COALESCE(commission_stats.commissions_ytd, 0)::numeric as commissions_ytd,
    COALESCE(commission_stats.earned_ytd, 0)::numeric as earned_ytd,
    COALESCE(commission_stats.total_unearned, 0)::numeric as unearned_amount,
    CASE
      WHEN v_total_agency_premium > 0
      THEN ROUND(COALESCE(policy_stats.total_premium, 0) / v_total_agency_premium * 100, 1)
      ELSE 0
    END::numeric as pct_of_agency_production,
    up.created_at as joined_date
  FROM user_profiles up
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_premium
    FROM policies p
    WHERE p.user_id = up.id
  ) policy_stats ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start) as commissions_ytd,
      SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start) as earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    WHERE c.user_id = up.id
  ) commission_stats ON true
  WHERE up.agency_id = v_agency_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL
  ORDER BY COALESCE(policy_stats.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_production_by_agent(uuid) TO authenticated;

COMMENT ON FUNCTION get_agency_production_by_agent(uuid) IS
'Returns production breakdown by agent for a specific agency.
If no agency_id provided, defaults to user''s own agency.
Requires agency owner, IMO admin (same IMO), or super admin role.';


-- =====================================================
-- Helper: Check if user is agency owner
-- =====================================================

-- Create function if it doesn't exist (for backwards compatibility)
CREATE OR REPLACE FUNCTION is_agency_owner(p_agency_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_agency_id IS NULL THEN
    -- Check if user owns any agency
    RETURN EXISTS (
      SELECT 1 FROM agencies
      WHERE owner_id = auth.uid()
    );
  ELSE
    -- Check if user owns specific agency
    RETURN EXISTS (
      SELECT 1 FROM agencies
      WHERE id = p_agency_id AND owner_id = auth.uid()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION is_agency_owner(uuid) TO authenticated;

COMMENT ON FUNCTION is_agency_owner(uuid) IS
'Checks if the current user owns a specific agency (or any agency if no ID provided).';
