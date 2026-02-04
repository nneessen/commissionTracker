-- supabase/migrations/20260204152453_fix_lifecycle_status_remaining_functions.sql
-- Fix remaining RPC functions to use lifecycle_status instead of status for active policy checks
--
-- This migration completes the policy status decoupling started in 20260204141628.
-- All functions that check for "active" policies must use lifecycle_status = 'active',
-- not status = 'active' (which now means "approved application outcome").
--
-- Pattern applied:
-- - p.status = 'active' -> p.lifecycle_status = 'active' (policy lifecycle)
-- - p.status = 'lapsed' -> p.lifecycle_status = 'lapsed' (policy lifecycle)
-- - p.status = 'pending' -> UNCHANGED (application outcome, correct as-is)

-- ============================================================================
-- PRIORITY 1: Dashboard-Blocking Functions
-- ============================================================================

-- 1. get_imo_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_imo_dashboard_metrics()
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
  v_year_start timestamptz;
BEGIN
  -- Check access: must be IMO admin/owner or super admin
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
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
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active'), 0) as total_premium
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
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
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
$function$;

-- 2. get_agency_dashboard_metrics
CREATE OR REPLACE FUNCTION public.get_agency_dashboard_metrics(p_agency_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
  v_is_owner boolean;
  v_year_start timestamptz;
  v_owner_id uuid;
  v_owner_hierarchy_path text;
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

  -- Get the IMO and owner for this agency
  SELECT a.imo_id, a.owner_id
  INTO v_imo_id, v_owner_id
  FROM agencies a
  WHERE a.id = v_agency_id;

  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'Agency not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Get the owner's hierarchy path for team traversal
  SELECT COALESCE(up.hierarchy_path, up.id::text)
  INTO v_owner_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_owner_id;

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
  WITH
  team_members AS (
    SELECT up.id
    FROM user_profiles up
    WHERE up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = v_owner_id
        OR up.hierarchy_path LIKE v_owner_hierarchy_path || '.%'
      )
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
  ),
  policy_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') as active_policies,
      COALESCE(SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active'), 0) as total_premium
    FROM policies p
    WHERE p.user_id IN (SELECT id FROM team_members)
  ),
  commission_agg AS (
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as commissions_ytd,
      COALESCE(SUM(c.earned_amount) FILTER (WHERE c.payment_date >= v_year_start), 0) as earned_ytd,
      COALESCE(SUM(c.unearned_amount), 0) as total_unearned
    FROM commissions c
    WHERE c.user_id IN (SELECT id FROM team_members)
  ),
  user_agg AS (
    SELECT COUNT(*) as agent_count
    FROM team_members
  ),
  top_prod AS (
    SELECT
      up.id as user_id,
      COALESCE(up.first_name || ' ' || up.last_name, up.email) as producer_name,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM user_profiles up
    LEFT JOIN policies p ON p.user_id = up.id AND p.lifecycle_status = 'active'
    WHERE up.id IN (SELECT id FROM team_members)
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
$function$;

-- 3. get_imo_production_by_agency
CREATE OR REPLACE FUNCTION public.get_imo_production_by_agency(
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  agency_id uuid,
  agency_name text,
  agency_code text,
  owner_name text,
  new_policies bigint,
  policies_lapsed bigint,
  retention_rate numeric,
  new_premium numeric,
  commissions_earned numeric,
  agent_count bigint,
  avg_premium_per_agent numeric,
  rank_by_premium integer,
  rank_by_policies integer,
  pct_of_imo_premium numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Get total IMO premium for percentage calculation
  SELECT COALESCE(SUM(p.annual_premium), 0)
  INTO v_total_imo_premium
  FROM policies p
  WHERE p.imo_id = v_imo_id
    AND p.lifecycle_status = 'active'
    AND COALESCE(p.submit_date, p.created_at) >= p_start_date
    AND COALESCE(p.submit_date, p.created_at) <= p_end_date;

  RETURN QUERY
  WITH agency_owners AS (
    SELECT
      a.id as a_id,
      a.name as a_name,
      a.code as a_code,
      a.owner_id,
      COALESCE(up.hierarchy_path, up.id::text) as owner_hierarchy_path,
      COALESCE(up.first_name || ' ' || up.last_name, up.email, 'No Owner') as o_name
    FROM agencies a
    LEFT JOIN user_profiles up ON a.owner_id = up.id
    WHERE a.imo_id = v_imo_id
      AND a.is_active = true
  ),
  agency_team_members AS (
    SELECT
      ao.a_id,
      up.id as user_id
    FROM agency_owners ao
    JOIN user_profiles up ON (
      up.approval_status = 'approved'
      AND up.archived_at IS NULL
      AND (
        up.id = ao.owner_id
        OR up.hierarchy_path LIKE ao.owner_hierarchy_path || '.%'
      )
      AND (
        up.roles @> ARRAY['agent']
        OR up.roles @> ARRAY['active_agent']
        OR up.is_admin = true
      )
      AND NOT (
        up.roles @> ARRAY['recruit']
        AND NOT up.roles @> ARRAY['agent']
        AND NOT up.roles @> ARRAY['active_agent']
      )
    )
  ),
  policy_stats AS (
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as policy_count,
      COALESCE(SUM(p.annual_premium), 0) as total_premium
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.lifecycle_status = 'active'
      AND COALESCE(p.submit_date, p.created_at) >= p_start_date
      AND COALESCE(p.submit_date, p.created_at) <= p_end_date
    GROUP BY atm.a_id
  ),
  lapse_stats AS (
    SELECT
      atm.a_id,
      COUNT(DISTINCT p.id) as lapsed_count
    FROM agency_team_members atm
    LEFT JOIN policies p ON p.user_id = atm.user_id
      AND p.lifecycle_status = 'lapsed'
      AND p.cancellation_date >= p_start_date
      AND p.cancellation_date <= p_end_date
    GROUP BY atm.a_id
  ),
  commission_stats AS (
    SELECT
      atm.a_id,
      COALESCE(SUM(c.earned_amount), 0) as comm_earned
    FROM agency_team_members atm
    LEFT JOIN commissions c ON c.user_id = atm.user_id
      AND c.payment_date >= p_start_date
      AND c.payment_date <= p_end_date
    GROUP BY atm.a_id
  ),
  agent_counts AS (
    SELECT
      a_id,
      COUNT(DISTINCT user_id) as cnt
    FROM agency_team_members
    GROUP BY a_id
  ),
  agency_metrics AS (
    SELECT
      ao.a_id,
      ao.a_name,
      ao.a_code,
      ao.o_name,
      COALESCE(ps.policy_count, 0)::bigint as m_new_policies,
      COALESCE(ls.lapsed_count, 0)::bigint as m_policies_lapsed,
      CASE
        WHEN (COALESCE(ps.policy_count, 0) + COALESCE(ls.lapsed_count, 0)) > 0
        THEN ROUND(
          COALESCE(ps.policy_count, 0)::numeric /
          (COALESCE(ps.policy_count, 0) + COALESCE(ls.lapsed_count, 0)) * 100
        , 1)
        ELSE 100
      END::numeric as m_retention_rate,
      COALESCE(ps.total_premium, 0)::numeric as m_new_premium,
      COALESCE(cs.comm_earned, 0)::numeric as m_commissions_earned,
      COALESCE(ac.cnt, 0)::bigint as m_agent_count,
      CASE
        WHEN COALESCE(ac.cnt, 0) > 0
        THEN ROUND(COALESCE(ps.total_premium, 0) / ac.cnt, 2)
        ELSE 0
      END::numeric as m_avg_premium_per_agent,
      CASE
        WHEN v_total_imo_premium > 0
        THEN ROUND(COALESCE(ps.total_premium, 0) / v_total_imo_premium * 100, 1)
        ELSE 0
      END::numeric as m_pct_of_imo_premium
    FROM agency_owners ao
    LEFT JOIN policy_stats ps ON ps.a_id = ao.a_id
    LEFT JOIN lapse_stats ls ON ls.a_id = ao.a_id
    LEFT JOIN commission_stats cs ON cs.a_id = ao.a_id
    LEFT JOIN agent_counts ac ON ac.a_id = ao.a_id
  )
  SELECT
    am.a_id,
    am.a_name,
    am.a_code,
    am.o_name,
    am.m_new_policies,
    am.m_policies_lapsed,
    am.m_retention_rate,
    am.m_new_premium,
    am.m_commissions_earned,
    am.m_agent_count,
    am.m_avg_premium_per_agent,
    RANK() OVER (ORDER BY am.m_new_premium DESC)::integer,
    RANK() OVER (ORDER BY am.m_new_policies DESC)::integer,
    am.m_pct_of_imo_premium
  FROM agency_metrics am
  ORDER BY am.m_new_premium DESC;
END;
$function$;

-- 4. get_agency_production_by_agent
CREATE OR REPLACE FUNCTION public.get_agency_production_by_agent(p_agency_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
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
  joined_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  WHERE p.agency_id = v_agency_id AND p.lifecycle_status = 'active';

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
      COUNT(*) FILTER (WHERE p.lifecycle_status = 'active') as active_policies,
      SUM(p.annual_premium) FILTER (WHERE p.lifecycle_status = 'active') as total_premium
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
    AND (
      up.roles @> ARRAY['agent']
      OR up.roles @> ARRAY['active_agent']
      OR up.is_admin = true
    )
    AND NOT (
      up.roles @> ARRAY['recruit']
      AND NOT up.roles @> ARRAY['agent']
      AND NOT up.roles @> ARRAY['active_agent']
    )
  ORDER BY COALESCE(ps.total_premium, 0) DESC;
END;
$function$;

-- ============================================================================
-- PRIORITY 3: Client Stats Functions
-- ============================================================================

-- 5. get_clients_with_stats
CREATE OR REPLACE FUNCTION public.get_clients_with_stats(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  notes text,
  status character varying,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  policy_count bigint,
  active_policy_count bigint,
  total_premium numeric,
  avg_premium numeric,
  last_policy_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.lifecycle_status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    COALESCE(AVG(p.annual_premium), 0) as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  LEFT JOIN policies p ON p.client_id = c.id
  WHERE c.user_id = v_user_id
  GROUP BY c.id, c.user_id, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$function$;

-- 6. get_downline_clients_with_stats
CREATE OR REPLACE FUNCTION public.get_downline_clients_with_stats(p_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  notes text,
  status character varying,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  policy_count bigint,
  active_policy_count bigint,
  total_premium numeric,
  avg_premium numeric,
  last_policy_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_hierarchy_path text;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  SELECT COALESCE(up.hierarchy_path, up.id::text)
  INTO v_hierarchy_path
  FROM user_profiles up
  WHERE up.id = v_user_id;

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.lifecycle_status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    COALESCE(AVG(p.annual_premium), 0) as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON p.client_id = c.id
  WHERE (
    up.id = v_user_id
    OR up.hierarchy_path LIKE v_hierarchy_path || '.%'
  )
  GROUP BY c.id, c.user_id, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$function$;

-- 7. get_imo_clients_with_stats
CREATE OR REPLACE FUNCTION public.get_imo_clients_with_stats()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  address text,
  date_of_birth date,
  notes text,
  status character varying,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  policy_count bigint,
  active_policy_count bigint,
  total_premium numeric,
  avg_premium numeric,
  last_policy_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_imo_id uuid;
BEGIN
  IF NOT (is_imo_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Access denied: IMO admin or super admin required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_imo_id := get_my_imo_id();
  IF v_imo_id IS NULL THEN
    RAISE EXCEPTION 'User is not associated with an IMO'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.date_of_birth,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    COUNT(p.id) as policy_count,
    COUNT(CASE WHEN p.lifecycle_status = 'active' THEN 1 END) as active_policy_count,
    COALESCE(SUM(p.annual_premium), 0) as total_premium,
    COALESCE(AVG(p.annual_premium), 0) as avg_premium,
    MAX(p.effective_date) as last_policy_date
  FROM clients c
  JOIN user_profiles up ON c.user_id = up.id
  LEFT JOIN policies p ON p.client_id = c.id
  WHERE up.imo_id = v_imo_id
  GROUP BY c.id, c.user_id, c.name, c.email, c.phone, c.address,
           c.date_of_birth, c.notes, c.status, c.created_at, c.updated_at
  ORDER BY c.name;
END;
$function$;

-- ============================================================================
-- PRIORITY 5: Other Functions
-- ============================================================================

-- 8. get_policies_for_lapse_check
CREATE OR REPLACE FUNCTION public.get_policies_for_lapse_check()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  policy_number text,
  annual_premium numeric,
  effective_date date,
  term_length integer,
  months_active integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.policy_number,
    p.annual_premium,
    p.effective_date,
    p.term_length,
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.effective_date))::integer +
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.effective_date))::integer * 12 as months_active
  FROM policies p
  WHERE p.lifecycle_status = 'active'
    AND p.effective_date IS NOT NULL
    AND p.term_length IS NOT NULL;
END;
$function$;

-- ============================================================================
-- Add comments documenting the updates
-- ============================================================================

COMMENT ON FUNCTION get_imo_dashboard_metrics IS
'IMO dashboard metrics. Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453 as part of policy status decoupling.';

COMMENT ON FUNCTION get_agency_dashboard_metrics IS
'Agency dashboard metrics with hierarchy traversal.
Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453 as part of policy status decoupling.';

COMMENT ON FUNCTION get_imo_production_by_agency IS
'IMO production by agency report.
Uses lifecycle_status = ''active'' for new policies, lifecycle_status = ''lapsed'' for lapsed.
Fixed in migration 20260204152453 as part of policy status decoupling.';

COMMENT ON FUNCTION get_agency_production_by_agent IS
'Agency production by agent report.
Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453 as part of policy status decoupling.';

COMMENT ON FUNCTION get_clients_with_stats IS
'Client stats for a user. Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453.';

COMMENT ON FUNCTION get_downline_clients_with_stats IS
'Client stats for user''s downline. Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453.';

COMMENT ON FUNCTION get_imo_clients_with_stats IS
'Client stats for IMO. Uses lifecycle_status = ''active'' for active policy counts.
Fixed in migration 20260204152453.';

COMMENT ON FUNCTION get_policies_for_lapse_check IS
'Returns active policies for lapse checking. Uses lifecycle_status = ''active''.
Fixed in migration 20260204152453.';
