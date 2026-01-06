-- supabase/migrations/reverts/20260106_005_org_metrics_date_range_revert.sql
-- Revert: Remove date range parameters from org metrics RPC functions
-- Restores original YTD-only behavior

-- =====================================================
-- 1. Restore get_imo_dashboard_metrics() - no date params
-- =====================================================

DROP FUNCTION IF EXISTS get_imo_dashboard_metrics(date, date);

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
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO';
  END IF;

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

GRANT EXECUTE ON FUNCTION get_imo_dashboard_metrics() TO authenticated;

-- =====================================================
-- 2. Restore get_agency_dashboard_metrics(uuid) - no date params
-- =====================================================

DROP FUNCTION IF EXISTS get_agency_dashboard_metrics(uuid, date, date);

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
  IF p_agency_id IS NOT NULL THEN
    v_agency_id := p_agency_id;
  ELSE
    v_agency_id := get_my_agency_id();
  END IF;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not associated with an agency';
  END IF;

  SELECT a.imo_id INTO v_imo_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM agencies
    WHERE id = v_agency_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  IF NOT (v_is_owner OR (is_imo_admin() AND get_my_imo_id() = v_imo_id) OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: must be agency owner, IMO admin, or super admin';
  END IF;

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

-- =====================================================
-- 3. Restore get_imo_production_by_agency() - no date params
-- =====================================================

DROP FUNCTION IF EXISTS get_imo_production_by_agency(date, date);

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
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO';
  END IF;

  v_year_start := date_trunc('year', CURRENT_DATE)::date;

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

-- =====================================================
-- 4. Restore get_imo_override_summary() - no date params
-- =====================================================

DROP FUNCTION IF EXISTS get_imo_override_summary(date, date);

CREATE OR REPLACE FUNCTION get_imo_override_summary()
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
  SELECT up.imo_id INTO v_imo_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not assigned to an IMO'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  SELECT
    i.id AS imo_id,
    i.name AS imo_name,
    COUNT(oc.id) AS total_override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(oc.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT oc.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT oc.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT oc.policy_id) > 0
      THEN ROUND(SUM(oc.override_commission_amount) / COUNT(DISTINCT oc.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy
  FROM imos i
  LEFT JOIN override_commissions oc ON oc.imo_id = i.id
  WHERE i.id = v_imo_id
  GROUP BY i.id, i.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_imo_override_summary() TO authenticated;

-- =====================================================
-- 5. Restore get_agency_override_summary(uuid) - no date params
-- =====================================================

DROP FUNCTION IF EXISTS get_agency_override_summary(uuid, date, date);

CREATE OR REPLACE FUNCTION get_agency_override_summary(p_agency_id uuid DEFAULT NULL)
RETURNS TABLE (
  agency_id uuid,
  agency_name text,
  total_override_count bigint,
  total_override_amount numeric,
  pending_amount numeric,
  earned_amount numeric,
  paid_amount numeric,
  chargeback_amount numeric,
  unique_uplines bigint,
  unique_downlines bigint,
  avg_override_per_policy numeric,
  top_earner_id uuid,
  top_earner_name text,
  top_earner_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_user_agency_id uuid;
  v_is_owner boolean;
  v_is_imo_admin boolean;
BEGIN
  SELECT up.agency_id INTO v_user_agency_id
  FROM user_profiles up
  WHERE up.id = auth.uid();

  v_agency_id := COALESCE(p_agency_id, v_user_agency_id);

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency specified and user is not assigned to an agency'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT is_agency_owner(v_agency_id) INTO v_is_owner;
  SELECT is_imo_admin() INTO v_is_imo_admin;

  IF NOT v_is_owner AND NOT v_is_imo_admin THEN
    RAISE EXCEPTION 'Access denied: Agency owner or IMO admin role required'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  WITH override_stats AS (
    SELECT
      oc.override_agent_id,
      SUM(oc.override_commission_amount) AS agent_total
    FROM override_commissions oc
    WHERE oc.agency_id = v_agency_id
    GROUP BY oc.override_agent_id
    ORDER BY agent_total DESC
    LIMIT 1
  ),
  top_earner AS (
    SELECT
      os.override_agent_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) AS name,
      os.agent_total
    FROM override_stats os
    LEFT JOIN user_profiles up ON up.id = os.override_agent_id
  )
  SELECT
    a.id AS agency_id,
    a.name AS agency_name,
    COUNT(oc.id) AS total_override_count,
    COALESCE(SUM(oc.override_commission_amount), 0) AS total_override_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'pending' THEN oc.override_commission_amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'earned' THEN oc.override_commission_amount ELSE 0 END), 0) AS earned_amount,
    COALESCE(SUM(CASE WHEN oc.status = 'paid' THEN oc.override_commission_amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(oc.chargeback_amount), 0) AS chargeback_amount,
    COUNT(DISTINCT oc.override_agent_id) AS unique_uplines,
    COUNT(DISTINCT oc.base_agent_id) AS unique_downlines,
    CASE
      WHEN COUNT(DISTINCT oc.policy_id) > 0
      THEN ROUND(SUM(oc.override_commission_amount) / COUNT(DISTINCT oc.policy_id), 2)
      ELSE 0
    END AS avg_override_per_policy,
    te.override_agent_id AS top_earner_id,
    te.name AS top_earner_name,
    COALESCE(te.agent_total, 0) AS top_earner_amount
  FROM agencies a
  LEFT JOIN override_commissions oc ON oc.agency_id = a.id
  LEFT JOIN top_earner te ON true
  WHERE a.id = v_agency_id
  GROUP BY a.id, a.name, te.override_agent_id, te.name, te.agent_total;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agency_override_summary(uuid) TO authenticated;

-- =====================================================
-- Usage Instructions
-- =====================================================
-- To revert this migration, run:
-- psql -f supabase/migrations/reverts/20260106_005_org_metrics_date_range_revert.sql
--
-- Then update TypeScript code:
-- 1. Remove dateRange parameters from service methods
-- 2. Remove dateRange from hook calls
-- 3. Remove dateRange prop from OrgMetricsSection
-- 4. Regenerate types: npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
