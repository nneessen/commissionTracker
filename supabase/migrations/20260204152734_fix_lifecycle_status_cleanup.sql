-- supabase/migrations/20260204152734_fix_lifecycle_status_cleanup.sql
-- Cleanup: Drop duplicate functions created with wrong signatures and update originals
-- This fixes the issue where functions were created as new overloads instead of replacements

-- ============================================================================
-- 1. Drop the incorrectly created duplicate functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_imo_dashboard_metrics();
DROP FUNCTION IF EXISTS public.get_clients_with_stats();
DROP FUNCTION IF EXISTS public.get_downline_clients_with_stats();
DROP FUNCTION IF EXISTS public.get_imo_clients_with_stats();
DROP FUNCTION IF EXISTS public.get_policies_for_lapse_check();

-- ============================================================================
-- 2. Update the ORIGINAL get_imo_dashboard_metrics with date parameters
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_imo_dashboard_metrics(
  p_start_date date DEFAULT (date_trunc('year', CURRENT_DATE))::date,
  p_end_date date DEFAULT CURRENT_DATE
)
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

-- ============================================================================
-- 3. Update get_clients_with_stats (the one with user_id parameter)
-- ============================================================================

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

-- ============================================================================
-- 4. Update get_downline_clients_with_stats (the one with user_id parameter)
-- ============================================================================

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

-- ============================================================================
-- 5. Update get_policies_for_lapse_check (the one with parameters)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_policies_for_lapse_check(
  p_rule_id uuid,
  p_user_ids uuid[],
  p_warning_days integer
)
RETURNS TABLE(
  policy_id uuid,
  policy_number text,
  user_id uuid,
  user_name text,
  user_email text,
  annual_premium numeric,
  effective_date date,
  days_until_due integer,
  last_payment_date date,
  carrier_name text,
  product_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id as policy_id,
    p.policy_number,
    p.user_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email) as user_name,
    up.email as user_email,
    p.annual_premium,
    p.effective_date,
    (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE as days_until_due,
    c.last_payment_date,
    cr.name as carrier_name,
    p.product as product_type
  FROM policies p
  JOIN user_profiles up ON up.id = p.user_id
  LEFT JOIN commissions c ON c.policy_id = p.id
  LEFT JOIN carriers cr ON cr.id = p.carrier_id
  WHERE p.lifecycle_status = 'active'
    AND p.user_id = ANY(p_user_ids)
    AND p.effective_date IS NOT NULL
    AND p.term_length IS NOT NULL
    AND (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE <= p_warning_days
    AND (p.effective_date + (p.term_length || ' months')::interval)::date - CURRENT_DATE > 0
  ORDER BY days_until_due ASC;
END;
$function$;

-- ============================================================================
-- 6. Update build_agency_org_chart
-- ============================================================================

-- First get the current function definition and fix it
-- The function uses p.status = 'active' in LATERAL subqueries

-- Note: Due to the complexity of this function, we need to query and update it directly
-- Let's update the org chart functions in a subsequent migration after verifying the dashboard works
