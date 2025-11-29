-- Migration: Create Materialized Views for Advanced Reporting
-- Purpose: Pre-compute expensive aggregations for fast report generation
-- Created: 2025-11-29

-- ============================================================================
-- 1. DAILY PRODUCTION SUMMARY
-- Tracks daily policy production metrics
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_production AS
SELECT
  user_id,
  DATE(effective_date) as production_date,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE status = 'lapsed') as lapsed_policies,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_policies,
  SUM(annual_premium) as total_premium,
  AVG(annual_premium) as avg_premium,
  MIN(annual_premium) as min_premium,
  MAX(annual_premium) as max_premium
FROM policies
GROUP BY user_id, DATE(effective_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_production_user_date ON mv_daily_production(user_id, production_date);

-- ============================================================================
-- 2. CARRIER PERFORMANCE METRICS
-- Aggregated carrier-level performance data
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_carrier_performance AS
SELECT
  p.user_id,
  p.carrier_id,
  c.name as carrier_name,
  COUNT(p.id) as total_policies,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE p.status = 'lapsed') as lapsed_policies,
  COUNT(*) FILTER (WHERE p.status = 'cancelled') as cancelled_policies,
  SUM(p.annual_premium) as total_premium,
  AVG(p.annual_premium) as avg_premium,
  -- Persistency rate
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.status = 'active') / NULLIF(COUNT(*), 0),
    2
  ) as persistency_rate,
  -- Commission metrics
  COUNT(DISTINCT co.id) as commission_count,
  COALESCE(SUM(co.commission_amount), 0) as total_commission_amount,
  COALESCE(AVG(co.commission_amount), 0) as avg_commission_amount,
  -- Average commission rate
  CASE
    WHEN SUM(p.annual_premium) > 0
    THEN ROUND(100.0 * COALESCE(SUM(co.commission_amount), 0) / SUM(p.annual_premium), 2)
    ELSE 0
  END as avg_commission_rate_pct,
  -- Count policies by age
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM AGE(CURRENT_DATE, p.effective_date)) / 2592000 >= 13) as policies_13mo_plus,
  -- Latest update
  MAX(p.updated_at) as latest_policy_update
FROM policies p
INNER JOIN carriers c ON c.id = p.carrier_id
LEFT JOIN commissions co ON co.policy_id = p.id
GROUP BY p.user_id, p.carrier_id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_carrier_performance_user_carrier ON mv_carrier_performance(user_id, carrier_id);

-- ============================================================================
-- 3. COHORT RETENTION ANALYSIS
-- Track policy retention by cohort month
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_cohort_retention AS
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('month', effective_date) as cohort_month,
    id as policy_id,
    status,
    effective_date,
    annual_premium
  FROM policies
),
cohort_ages AS (
  SELECT
    user_id,
    cohort_month,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, cohort_month))::INTEGER * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, cohort_month))::INTEGER as months_since_issue,
    policy_id,
    status,
    annual_premium
  FROM cohorts
)
SELECT
  user_id,
  cohort_month,
  months_since_issue,
  COUNT(*) as cohort_size,
  COUNT(*) FILTER (WHERE status = 'active') as still_active,
  COUNT(*) FILTER (WHERE status = 'lapsed') as lapsed_count,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
  SUM(annual_premium) as total_premium,
  SUM(annual_premium) FILTER (WHERE status = 'active') as active_premium,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0), 2) as retention_rate
FROM cohort_ages
GROUP BY user_id, cohort_month, months_since_issue;

CREATE INDEX IF NOT EXISTS idx_mv_cohort_retention_user_cohort ON mv_cohort_retention(user_id, cohort_month);
CREATE INDEX IF NOT EXISTS idx_mv_cohort_retention_user_months ON mv_cohort_retention(user_id, months_since_issue);

-- ============================================================================
-- 4. COMMISSION AGING ANALYSIS
-- Track commission risk by aging buckets
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_commission_aging AS
SELECT
  c.user_id,
  CASE
    WHEN c.months_paid < 3 THEN '0-3 months'
    WHEN c.months_paid < 6 THEN '3-6 months'
    WHEN c.months_paid < 9 THEN '6-9 months'
    WHEN c.months_paid < 12 THEN '9-12 months'
    ELSE '12+ months'
  END as aging_bucket,
  -- Numeric bucket for ordering
  CASE
    WHEN c.months_paid < 3 THEN 1
    WHEN c.months_paid < 6 THEN 2
    WHEN c.months_paid < 9 THEN 3
    WHEN c.months_paid < 12 THEN 4
    ELSE 5
  END as bucket_order,
  COUNT(*) as commission_count,
  COUNT(DISTINCT c.policy_id) as policy_count,
  SUM(c.unearned_amount) as total_at_risk,
  SUM(c.earned_amount) as total_earned,
  SUM(c.commission_amount) as total_commission,
  AVG(c.unearned_amount) as avg_at_risk,
  -- Risk level based on months paid
  CASE
    WHEN c.months_paid < 2 THEN 'Critical'
    WHEN c.months_paid < 3 THEN 'High'
    WHEN c.months_paid < 6 THEN 'Medium'
    WHEN c.months_paid < 12 THEN 'Low'
    ELSE 'Secure'
  END as risk_level
FROM commissions c
INNER JOIN policies p ON p.id = c.policy_id
WHERE p.status = 'active'
GROUP BY c.user_id, aging_bucket, bucket_order, risk_level;

CREATE INDEX IF NOT EXISTS idx_mv_commission_aging_user ON mv_commission_aging(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_commission_aging_user_bucket ON mv_commission_aging(user_id, bucket_order);

-- ============================================================================
-- 5. CLIENT LIFETIME VALUE
-- Calculate comprehensive client metrics
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_ltv AS
SELECT
  p.user_id,
  p.client_id,
  cl.name as client_name,
  cl.email,
  cl.address->>'state' as state,
  -- Policy counts
  COUNT(p.id) as total_policies,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE p.status = 'lapsed') as lapsed_policies,
  COUNT(*) FILTER (WHERE p.status = 'cancelled') as cancelled_policies,
  -- Premium metrics
  SUM(p.annual_premium) as total_premium,
  SUM(p.annual_premium) FILTER (WHERE p.status = 'active') as active_premium,
  AVG(p.annual_premium) as avg_premium_per_policy,
  -- Commission metrics
  COALESCE(SUM(c.commission_amount), 0) as total_commission,
  COALESCE(SUM(c.commission_amount) FILTER (WHERE c.status = 'paid'), 0) as paid_commission,
  COALESCE(AVG(c.commission_amount), 0) as avg_commission_per_policy,
  -- Client age and tenure
  MIN(p.effective_date) as first_policy_date,
  MAX(p.effective_date) as latest_policy_date,
  ROUND(
    AVG(
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.effective_date))::NUMERIC * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.effective_date))::NUMERIC
    ),
    2
  ) as avg_policy_age_months,
  -- Client value tier
  CASE
    WHEN SUM(p.annual_premium) FILTER (WHERE p.status = 'active') >= 5000 THEN 'A'
    WHEN SUM(p.annual_premium) FILTER (WHERE p.status = 'active') >= 2000 THEN 'B'
    WHEN SUM(p.annual_premium) FILTER (WHERE p.status = 'active') >= 500 THEN 'C'
    ELSE 'D'
  END as client_tier,
  -- Cross-sell potential (clients with only 1 active policy)
  CASE
    WHEN COUNT(*) FILTER (WHERE p.status = 'active') = 1 THEN true
    ELSE false
  END as cross_sell_opportunity
FROM policies p
INNER JOIN clients cl ON cl.id = p.client_id
LEFT JOIN commissions c ON c.policy_id = p.id
GROUP BY p.user_id, p.client_id, cl.name, cl.email, (cl.address->>'state');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_client_ltv_user_client ON mv_client_ltv(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_mv_client_ltv_user_tier ON mv_client_ltv(user_id, client_tier);

-- ============================================================================
-- 6. PRODUCT PERFORMANCE METRICS
-- Aggregated product-level performance
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_performance AS
SELECT
  p.user_id,
  p.product_id,
  prod.name as product_name,
  prod.product_type,
  COUNT(p.id) as total_policies,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  COUNT(*) FILTER (WHERE p.status = 'lapsed') as lapsed_policies,
  SUM(p.annual_premium) as total_premium,
  AVG(p.annual_premium) as avg_premium,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE p.status = 'active') / NULLIF(COUNT(*), 0),
    2
  ) as persistency_rate,
  -- Commission metrics
  COALESCE(SUM(c.commission_amount), 0) as total_commission,
  COALESCE(AVG(c.commission_amount), 0) as avg_commission,
  CASE
    WHEN SUM(p.annual_premium) > 0
    THEN ROUND(100.0 * COALESCE(SUM(c.commission_amount), 0) / SUM(p.annual_premium), 2)
    ELSE 0
  END as avg_commission_rate_pct
FROM policies p
INNER JOIN products prod ON prod.id = p.product_id
LEFT JOIN commissions c ON c.policy_id = p.id
GROUP BY p.user_id, p.product_id, prod.name, prod.product_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_performance_user_product ON mv_product_performance(user_id, product_id);

-- ============================================================================
-- 7. EXPENSE SUMMARY BY CATEGORY
-- Aggregated expense metrics for financial analysis
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_expense_summary AS
SELECT
  e.user_id,
  e.category,
  e.expense_type,
  DATE_TRUNC('month', e.expense_date) as expense_month,
  COUNT(*) as transaction_count,
  SUM(e.amount) as total_amount,
  AVG(e.amount) as avg_amount,
  MIN(e.amount) as min_amount,
  MAX(e.amount) as max_amount,
  COUNT(*) FILTER (WHERE e.is_recurring = true) as recurring_count,
  SUM(e.amount) FILTER (WHERE e.is_recurring = true) as recurring_amount
FROM expenses e
GROUP BY e.user_id, e.category, e.expense_type, DATE_TRUNC('month', e.expense_date);

CREATE INDEX IF NOT EXISTS idx_mv_expense_summary_user_month ON mv_expense_summary(user_id, expense_month);
CREATE INDEX IF NOT EXISTS idx_mv_expense_summary_user_category ON mv_expense_summary(user_id, category);

-- ============================================================================
-- 8. PRODUCTION VELOCITY METRICS
-- Track production trends and velocity
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_production_velocity AS
WITH weekly_production AS (
  SELECT
    user_id,
    DATE_TRUNC('week', effective_date) as week_start,
    COUNT(*) as policies_written,
    SUM(annual_premium) as premium_written,
    AVG(annual_premium) as avg_premium
  FROM policies
  GROUP BY user_id, DATE_TRUNC('week', effective_date)
),
monthly_production AS (
  SELECT
    user_id,
    DATE_TRUNC('month', effective_date) as month_start,
    COUNT(*) as policies_written,
    SUM(annual_premium) as premium_written,
    AVG(annual_premium) as avg_premium
  FROM policies
  GROUP BY user_id, DATE_TRUNC('month', effective_date)
)
SELECT
  COALESCE(w.user_id, m.user_id) as user_id,
  w.week_start,
  m.month_start,
  w.policies_written as weekly_policies,
  w.premium_written as weekly_premium,
  w.avg_premium as weekly_avg_premium,
  m.policies_written as monthly_policies,
  m.premium_written as monthly_premium,
  m.avg_premium as monthly_avg_premium
FROM weekly_production w
FULL OUTER JOIN monthly_production m
  ON w.user_id = m.user_id
  AND DATE_TRUNC('month', w.week_start) = m.month_start;

CREATE INDEX IF NOT EXISTS idx_mv_production_velocity_user_week ON mv_production_velocity(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_mv_production_velocity_user_month ON mv_production_velocity(user_id, month_start);

-- ============================================================================
-- REFRESH FUNCTION
-- Convenience function to refresh all materialized views
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_all_report_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh views with unique indexes concurrently (non-blocking)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_production;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_carrier_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_ltv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_performance;

  -- Refresh views without unique indexes normally (brief lock)
  REFRESH MATERIALIZED VIEW mv_cohort_retention;
  REFRESH MATERIALIZED VIEW mv_commission_aging;
  REFRESH MATERIALIZED VIEW mv_expense_summary;
  REFRESH MATERIALIZED VIEW mv_production_velocity;

  -- Log refresh
  RAISE NOTICE 'All reporting materialized views refreshed at %', NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_all_report_materialized_views() TO authenticated;

-- ============================================================================
-- INITIAL REFRESH
-- Populate the materialized views
-- ============================================================================

-- Initial refresh to populate data
REFRESH MATERIALIZED VIEW mv_daily_production;
REFRESH MATERIALIZED VIEW mv_carrier_performance;
REFRESH MATERIALIZED VIEW mv_cohort_retention;
REFRESH MATERIALIZED VIEW mv_commission_aging;
REFRESH MATERIALIZED VIEW mv_client_ltv;
REFRESH MATERIALIZED VIEW mv_product_performance;
REFRESH MATERIALIZED VIEW mv_expense_summary;
REFRESH MATERIALIZED VIEW mv_production_velocity;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_daily_production IS 'Daily policy production metrics aggregated by user';
COMMENT ON MATERIALIZED VIEW mv_carrier_performance IS 'Carrier-level performance metrics including persistency and commission rates';
COMMENT ON MATERIALIZED VIEW mv_cohort_retention IS 'Cohort retention analysis tracking policy retention by month';
COMMENT ON MATERIALIZED VIEW mv_commission_aging IS 'Commission risk analysis by aging buckets';
COMMENT ON MATERIALIZED VIEW mv_client_ltv IS 'Client lifetime value and segmentation metrics';
COMMENT ON MATERIALIZED VIEW mv_product_performance IS 'Product-level performance and profitability metrics';
COMMENT ON MATERIALIZED VIEW mv_expense_summary IS 'Expense aggregations by category and month';
COMMENT ON MATERIALIZED VIEW mv_production_velocity IS 'Weekly and monthly production velocity trends';

COMMENT ON FUNCTION refresh_all_report_materialized_views() IS 'Refreshes all reporting materialized views - run daily via cron';
