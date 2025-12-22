-- Migration: Fix Dashboard Metrics Critical Issues
-- Addresses code review findings for Phase 5

-- =====================================================
-- 1. Add Performance Indexes
-- =====================================================

-- Index for IMO dashboard metrics - policies by IMO and status
CREATE INDEX IF NOT EXISTS idx_policies_imo_status_premium
ON policies (imo_id, status, annual_premium)
WHERE status = 'active';

-- Index for IMO dashboard metrics - commissions by IMO and payment date
CREATE INDEX IF NOT EXISTS idx_commissions_imo_payment_ytd
ON commissions (imo_id, payment_date, amount, earned_amount)
WHERE payment_date IS NOT NULL;

-- Index for agency production queries - user_profiles by agency
CREATE INDEX IF NOT EXISTS idx_user_profiles_agency_approved
ON user_profiles (agency_id, approval_status)
WHERE approval_status = 'approved' AND archived_at IS NULL;

-- =====================================================
-- 2. Add agency_id to policies for historical accuracy
-- =====================================================

-- Add agency_id column to policies (denormalized for historical accuracy)
ALTER TABLE policies ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);

-- Create index on agency_id
CREATE INDEX IF NOT EXISTS idx_policies_agency_id ON policies (agency_id);

-- Backfill existing policies with user's current agency
UPDATE policies p
SET agency_id = up.agency_id
FROM user_profiles up
WHERE p.user_id = up.id
  AND p.agency_id IS NULL
  AND up.agency_id IS NOT NULL;

-- Create trigger to automatically set agency_id on policy insert
CREATE OR REPLACE FUNCTION set_policy_agency_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set agency_id from user's current agency if not provided
  IF NEW.agency_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT agency_id INTO NEW.agency_id
    FROM user_profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_policy_agency_id ON policies;
CREATE TRIGGER trigger_set_policy_agency_id
  BEFORE INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION set_policy_agency_id();

-- =====================================================
-- 3. Recreate RPC functions with fixes
-- =====================================================

-- Drop and recreate with:
-- - UTC-based YTD calculations (consistent across timezones)
-- - Proper SQLSTATE error codes
-- - Direct agency_id usage for policies
-- - Optimized queries using new indexes

DROP FUNCTION IF EXISTS get_imo_dashboard_metrics();
DROP FUNCTION IF EXISTS get_agency_dashboard_metrics(uuid);
DROP FUNCTION IF EXISTS get_imo_production_by_agency();
DROP FUNCTION IF EXISTS get_agency_production_by_agent(uuid);

-- IMO Dashboard Metrics (Fixed)
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
  v_year_start timestamptz;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    -- Use SQLSTATE for programmatic error handling
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get current user's IMO
  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Use UTC for consistent YTD calculations across all timezones
  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  RETURN QUERY
  WITH policy_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.imo_id = v_imo_id
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    WHERE c.imo_id = v_imo_id
  ),
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.imo_id = v_imo_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ),
  agency_agg AS (
    SELECT COUNT(*) as agency_count
    FROM agencies a
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  )
  SELECT
    i.id as imo_id,
    i.name as imo_name,
    pa.active_policies::bigint as total_active_policies,
    pa.total_premium::numeric as total_annual_premium,
    ca.commissions_ytd::numeric as total_commissions_ytd,
    ca.earned_ytd::numeric as total_earned_ytd,
    ca.total_unearned::numeric as total_unearned,
    ua.agent_count::bigint as agent_count,
    aa.agency_count::bigint as agency_count,
    CASE
      WHEN ua.agent_count > 0
      THEN ROUND(pa.total_premium / ua.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent
  FROM imos i
  CROSS JOIN policy_agg pa
  CROSS JOIN commission_agg ca
  CROSS JOIN user_agg ua
  CROSS JOIN agency_agg aa
  WHERE i.id = v_imo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_dashboard_metrics() TO authenticated;

-- Agency Dashboard Metrics (Fixed)
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
  v_year_start timestamptz;
BEGIN
  -- Determine which agency to query
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Get the IMO for this agency
  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Check if user is owner of this agency
  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  -- Access check
  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- UTC-based YTD calculation
  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  RETURN QUERY
  WITH policy_agg AS (
    -- Use agency_id directly on policies for historical accuracy
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.agency_id = v_agency_id
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = v_agency_id
  ),
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.agency_id = v_agency_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ),
  top_prod AS (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM user_profiles up
    LEFT JOIN policies p ON p.user_id = up.id AND p.status = 'active'
    WHERE up.agency_id = v_agency_id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
    GROUP BY up.id, up.first_name, up.last_name, up.email
    ORDER BY total_premium DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    a.id as agency_id,
    a.name as agency_name,
    a.imo_id,
    pa.active_policies::bigint as active_policies,
    pa.total_premium::numeric as total_annual_premium,
    ca.commissions_ytd::numeric as total_commissions_ytd,
    ca.earned_ytd::numeric as total_earned_ytd,
    ca.total_unearned::numeric as total_unearned,
    ua.agent_count::bigint as agent_count,
    CASE
      WHEN ua.agent_count > 0
      THEN ROUND(pa.total_premium / ua.agent_count, 2)
      ELSE 0
    END::numeric as avg_production_per_agent,
    tp.user_id as top_producer_id,
    tp.producer_name as top_producer_name,
    COALESCE(tp.total_premium, 0)::numeric as top_producer_premium
  FROM agencies a
  CROSS JOIN policy_agg pa
  CROSS JOIN commission_agg ca
  CROSS JOIN user_agg ua
  LEFT JOIN top_prod tp ON true
  WHERE a.id = v_agency_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_dashboard_metrics(uuid) TO authenticated;

-- IMO Production by Agency (Fixed)
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
  v_year_start timestamptz;
  v_total_imo_premium numeric;
BEGIN
  -- Check access
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

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
    COALESCE(ps.active_policies, 0)::bigint as active_policies,
    COALESCE(ps.total_premium, 0)::numeric as total_annual_premium,
    COALESCE(cs.commissions_ytd, 0)::numeric as commissions_ytd,
    COALESCE(us.agent_count, 0)::bigint as agent_count,
    CASE
      WHEN COALESCE(us.agent_count, 0) > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / us.agent_count, 2)
      ELSE 0
    END::numeric as avg_production,
    CASE
      WHEN v_total_imo_premium > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_imo_premium * 100, 1)
      ELSE 0
    END::numeric as pct_of_imo_production
  FROM agencies a
  LEFT JOIN user_profiles owner ON a.owner_id = owner.id
  LEFT JOIN LATERAL (
    -- Use agency_id directly on policies
    SELECT
      COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as total_premium
    FROM policies p
    WHERE p.agency_id = a.id
  ) ps ON true
  LEFT JOIN LATERAL (
    SELECT SUM(c.amount) as commissions_ytd
    FROM commissions c
    INNER JOIN user_profiles up ON c.user_id = up.id
    WHERE up.agency_id = a.id
      AND c.payment_date >= v_year_start
  ) cs ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as agent_count
    FROM user_profiles up
    WHERE up.agency_id = a.id
      AND up.approval_status = 'approved'
      AND up.archived_at IS NULL
  ) us ON true
  WHERE a.imo_id = v_imo_id
    AND a.is_active = true
  ORDER BY COALESCE(ps.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_production_by_agency() TO authenticated;

-- Agency Production by Agent (Fixed)
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
  v_year_start timestamptz;
  v_total_agency_premium numeric;
BEGIN
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_year_start := date_trunc('year', now() AT TIME ZONE 'UTC');

  -- Get total agency premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_agency_premium
  FROM policies p
  WHERE p.agency_id = v_agency_id AND p.status = 'active';

  RETURN QUERY
  SELECT
    up.id as agent_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as agent_name,
    up.email as agent_email,
    up.contract_level,
    COALESCE(ps.active_policies, 0)::bigint as active_policies,
    COALESCE(ps.total_premium, 0)::numeric as total_annual_premium,
    COALESCE(cs.commissions_ytd, 0)::numeric as commissions_ytd,
    COALESCE(cs.earned_ytd, 0)::numeric as earned_ytd,
    COALESCE(cs.total_unearned, 0)::numeric as unearned_amount,
    CASE
      WHEN v_total_agency_premium > 0
      THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_agency_premium * 100, 1)
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
  ) ps ON true
  LEFT JOIN LATERAL (
    SELECT
      SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start) as commissions_ytd,
      SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start) as earned_ytd,
      SUM(c.unearned_amount) as total_unearned
    FROM commissions c
    WHERE c.user_id = up.id
  ) cs ON true
  WHERE up.agency_id = v_agency_id
    AND up.approval_status = 'approved'
    AND up.archived_at IS NULL
  ORDER BY COALESCE(ps.total_premium, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_production_by_agent(uuid) TO authenticated;

-- Add comments documenting the UTC timezone decision
COMMENT ON FUNCTION get_imo_dashboard_metrics() IS
'Returns aggregated dashboard metrics for the current user''s IMO.
YTD calculations use UTC timezone for consistency across all users.
Requires IMO admin, IMO owner, or super admin role.
Error codes: insufficient_privilege, invalid_parameter_value';

COMMENT ON FUNCTION get_agency_dashboard_metrics(uuid) IS
'Returns aggregated dashboard metrics for a specific agency.
YTD calculations use UTC timezone for consistency across all users.
Policies are attributed to the agency where they were created (historical accuracy).
Error codes: insufficient_privilege, invalid_parameter_value, no_data_found';
