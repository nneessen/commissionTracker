-- supabase/migrations/20260116_001_secure_report_mvs.sql
-- Security fix: Protect report MVs with SECURITY DEFINER RPCs
-- These MVs have user_id columns but no RLS, allowing cross-tenant data access
-- Solution: Revoke direct access, expose via secure RPCs

--------------------------------------------------------------------------------
-- 1. REVOKE DIRECT ACCESS TO MVs (defense in depth)
--------------------------------------------------------------------------------

-- Revoke SELECT on all report MVs from public roles
-- This prevents direct querying; only our RPCs can access them

REVOKE SELECT ON mv_carrier_performance FROM anon, authenticated;
REVOKE SELECT ON mv_client_ltv FROM anon, authenticated;
REVOKE SELECT ON mv_cohort_retention FROM anon, authenticated;
REVOKE SELECT ON mv_commission_aging FROM anon, authenticated;
REVOKE SELECT ON mv_daily_production FROM anon, authenticated;
REVOKE SELECT ON mv_expense_summary FROM anon, authenticated;
REVOKE SELECT ON mv_product_performance FROM anon, authenticated;
REVOKE SELECT ON mv_production_velocity FROM anon, authenticated;
REVOKE SELECT ON commission_chargeback_summary FROM anon, authenticated;

--------------------------------------------------------------------------------
-- 2. CREATE SECURITY DEFINER RPCs
-- These enforce user_id = auth.uid() at the database level
--------------------------------------------------------------------------------

-- Carrier Performance
CREATE OR REPLACE FUNCTION get_user_carrier_performance()
RETURNS SETOF mv_carrier_performance
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_carrier_performance
  WHERE user_id::uuid = auth.uid();
$$;

COMMENT ON FUNCTION get_user_carrier_performance() IS
  'Securely fetch carrier performance data for the authenticated user only';

-- Client LTV
CREATE OR REPLACE FUNCTION get_user_client_ltv()
RETURNS SETOF mv_client_ltv
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_client_ltv
  WHERE user_id::uuid = auth.uid();
$$;

COMMENT ON FUNCTION get_user_client_ltv() IS
  'Securely fetch client LTV data for the authenticated user only';

-- Cohort Retention
CREATE OR REPLACE FUNCTION get_user_cohort_retention()
RETURNS SETOF mv_cohort_retention
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_cohort_retention
  WHERE user_id::uuid = auth.uid()
  ORDER BY cohort_month DESC;
$$;

COMMENT ON FUNCTION get_user_cohort_retention() IS
  'Securely fetch cohort retention data for the authenticated user only';

-- Commission Aging
CREATE OR REPLACE FUNCTION get_user_commission_aging()
RETURNS SETOF mv_commission_aging
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_commission_aging
  WHERE user_id::uuid = auth.uid()
  ORDER BY bucket_order ASC;
$$;

COMMENT ON FUNCTION get_user_commission_aging() IS
  'Securely fetch commission aging data for the authenticated user only';

-- Daily Production
CREATE OR REPLACE FUNCTION get_user_daily_production(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS SETOF mv_daily_production
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_daily_production
  WHERE user_id::uuid = auth.uid()
    AND (p_start_date IS NULL OR production_date::date >= p_start_date)
    AND (p_end_date IS NULL OR production_date::date <= p_end_date)
  ORDER BY production_date DESC;
$$;

COMMENT ON FUNCTION get_user_daily_production(DATE, DATE) IS
  'Securely fetch daily production data for the authenticated user only';

-- Expense Summary
CREATE OR REPLACE FUNCTION get_user_expense_summary()
RETURNS SETOF mv_expense_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_expense_summary
  WHERE user_id::uuid = auth.uid()
  ORDER BY expense_month DESC;
$$;

COMMENT ON FUNCTION get_user_expense_summary() IS
  'Securely fetch expense summary data for the authenticated user only';

-- Product Performance
CREATE OR REPLACE FUNCTION get_user_product_performance()
RETURNS SETOF mv_product_performance
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_product_performance
  WHERE user_id::uuid = auth.uid();
$$;

COMMENT ON FUNCTION get_user_product_performance() IS
  'Securely fetch product performance data for the authenticated user only';

-- Production Velocity
CREATE OR REPLACE FUNCTION get_user_production_velocity(
  p_limit INT DEFAULT 12
)
RETURNS SETOF mv_production_velocity
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM mv_production_velocity
  WHERE user_id::uuid = auth.uid()
  ORDER BY week_start DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_user_production_velocity(INT) IS
  'Securely fetch production velocity data for the authenticated user only';

-- Commission Chargeback Summary
CREATE OR REPLACE FUNCTION get_user_commission_chargeback_summary()
RETURNS commission_chargeback_summary
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM commission_chargeback_summary
  WHERE user_id::uuid = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_commission_chargeback_summary() IS
  'Securely fetch commission chargeback summary for the authenticated user only';

--------------------------------------------------------------------------------
-- 3. GRANT EXECUTE ON RPCs TO authenticated role
--------------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_user_carrier_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_client_ltv() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cohort_retention() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_commission_aging() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_production(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_expense_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_product_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_production_velocity(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_commission_chargeback_summary() TO authenticated;
