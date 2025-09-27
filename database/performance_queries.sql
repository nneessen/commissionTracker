-- /home/nneessen/projects/commissionTracker/database/performance_queries.sql
-- High-performance queries optimized for commission tracking analytics
-- These queries leverage the indexes and views for maximum speed

-- =============================================================================
-- DASHBOARD QUERIES - OPTIMIZED FOR SPEED
-- =============================================================================

-- Quick dashboard summary (uses materialized view)
SELECT * FROM dashboard_summary;

-- Agent performance summary - current year
SELECT
  a.id,
  a.name,
  a.contract_comp_level,
  COUNT(c.id) as commission_count,
  SUM(c.commission_amount) as total_commission,
  SUM(c.annual_premium) as total_premium,
  AVG(c.commission_rate) as avg_commission_rate,
  SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END) as paid_commission,
  SUM(CASE WHEN c.status = 'expected' THEN c.commission_amount ELSE 0 END) as expected_commission
FROM agents a
LEFT JOIN commissions c ON a.id = c.agent_id
  AND c.year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
WHERE a.is_active = true
GROUP BY a.id, a.name, a.contract_comp_level
ORDER BY total_commission DESC NULLS LAST;

-- Monthly commission trend - last 12 months
SELECT
  year_earned,
  month_earned,
  COUNT(*) as commission_count,
  SUM(commission_amount) as total_commission,
  SUM(annual_premium) as total_premium,
  AVG(commission_rate) as avg_rate
FROM commissions
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  AND status IN ('paid', 'expected')
GROUP BY year_earned, month_earned
ORDER BY year_earned DESC, month_earned DESC;

-- =============================================================================
-- COMMISSION CALCULATION QUERIES
-- =============================================================================

-- Fast commission rate lookup using comp guide
CREATE OR REPLACE FUNCTION get_commission_rate(
  p_carrier_id UUID,
  p_product_name VARCHAR,
  p_contract_level INTEGER
) RETURNS DECIMAL(6,3) AS $$
DECLARE
  rate DECIMAL(6,3);
BEGIN
  SELECT commission_percentage INTO rate
  FROM comp_guide
  WHERE carrier_id = p_carrier_id
    AND product_name = p_product_name
    AND contract_level = p_contract_level
    AND is_active = true
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    AND effective_date <= CURRENT_DATE
  ORDER BY effective_date DESC
  LIMIT 1;

  RETURN COALESCE(rate, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Commission calculation with automatic comp guide lookup
CREATE OR REPLACE FUNCTION calculate_commission_amount(
  p_monthly_premium DECIMAL,
  p_advance_months INTEGER,
  p_commission_rate DECIMAL
) RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN ROUND(p_monthly_premium * p_advance_months * (p_commission_rate / 100), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- PERFORMANCE ANALYTICS QUERIES
-- =============================================================================

-- Top performing agents by commission - YTD
SELECT
  a.name,
  a.contract_comp_level,
  SUM(c.commission_amount) as ytd_commission,
  COUNT(c.id) as policy_count,
  AVG(c.annual_premium) as avg_premium,
  AVG(c.commission_rate) as avg_rate,
  SUM(c.commission_amount) / COUNT(c.id) as avg_commission_per_policy
FROM agents a
JOIN commissions c ON a.id = c.agent_id
WHERE c.year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
  AND c.status IN ('paid', 'expected')
  AND a.is_active = true
GROUP BY a.id, a.name, a.contract_comp_level
HAVING COUNT(c.id) > 0
ORDER BY ytd_commission DESC;

-- Carrier performance analysis
SELECT
  car.name as carrier_name,
  COUNT(c.id) as commission_count,
  SUM(c.commission_amount) as total_commission,
  SUM(c.annual_premium) as total_premium,
  AVG(c.commission_rate) as avg_commission_rate,
  SUM(c.commission_amount) / SUM(c.annual_premium) * 100 as effective_rate_percentage
FROM carriers car
JOIN commissions c ON car.id = c.carrier_id
WHERE c.year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
  AND c.status IN ('paid', 'expected')
GROUP BY car.id, car.name
ORDER BY total_commission DESC;

-- Product type performance
SELECT
  product_type,
  COUNT(*) as policy_count,
  SUM(commission_amount) as total_commission,
  SUM(annual_premium) as total_premium,
  AVG(commission_rate) as avg_rate,
  AVG(annual_premium) as avg_premium
FROM commissions
WHERE year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
  AND status IN ('paid', 'expected')
GROUP BY product_type
ORDER BY total_commission DESC;

-- =============================================================================
-- CHARGEBACK ANALYSIS QUERIES
-- =============================================================================

-- Chargeback risk analysis by policy age
SELECT
  CASE
    WHEN days_since_effective <= 90 THEN '0-3 months'
    WHEN days_since_effective <= 180 THEN '3-6 months'
    WHEN days_since_effective <= 365 THEN '6-12 months'
    WHEN days_since_effective <= 730 THEN '1-2 years'
    ELSE '2+ years'
  END as policy_age_group,
  COUNT(p.id) as total_policies,
  COUNT(cb.id) as chargebacks,
  ROUND(COUNT(cb.id)::DECIMAL / COUNT(p.id) * 100, 2) as chargeback_rate_percent,
  SUM(cb.chargeback_amount) as total_chargeback_amount
FROM policy_performance_view p
LEFT JOIN chargebacks cb ON p.id = cb.policy_id
GROUP BY
  CASE
    WHEN days_since_effective <= 90 THEN '0-3 months'
    WHEN days_since_effective <= 180 THEN '3-6 months'
    WHEN days_since_effective <= 365 THEN '6-12 months'
    WHEN days_since_effective <= 730 THEN '1-2 years'
    ELSE '2+ years'
  END
ORDER BY MIN(days_since_effective);

-- Recent chargebacks requiring attention
SELECT
  cb.id,
  cb.chargeback_type,
  cb.chargeback_amount,
  cb.chargeback_date,
  cb.status,
  p.policy_number,
  p.client_name,
  car.name as carrier_name,
  a.name as agent_name
FROM chargebacks cb
JOIN policies p ON cb.policy_id = p.id
JOIN carriers car ON cb.carrier_id = car.id
LEFT JOIN agents a ON cb.agent_id = a.id
WHERE cb.status IN ('pending', 'disputed')
ORDER BY cb.chargeback_date DESC;

-- =============================================================================
-- FINANCIAL PERFORMANCE QUERIES
-- =============================================================================

-- Monthly financial summary with expenses
WITH monthly_commission AS (
  SELECT
    year_earned,
    month_earned,
    SUM(commission_amount) as commission_income
  FROM commissions
  WHERE status = 'paid'
  GROUP BY year_earned, month_earned
),
monthly_expenses AS (
  SELECT
    year_incurred,
    month_incurred,
    SUM(CASE WHEN category = 'business' THEN amount ELSE 0 END) as business_expenses,
    SUM(CASE WHEN category = 'personal' THEN amount ELSE 0 END) as personal_expenses
  FROM expenses
  GROUP BY year_incurred, month_incurred
)
SELECT
  COALESCE(mc.year_earned, me.year_incurred) as year,
  COALESCE(mc.month_earned, me.month_incurred) as month,
  COALESCE(mc.commission_income, 0) as commission_income,
  COALESCE(me.business_expenses, 0) as business_expenses,
  COALESCE(me.personal_expenses, 0) as personal_expenses,
  COALESCE(mc.commission_income, 0) - COALESCE(me.business_expenses, 0) as business_profit,
  COALESCE(mc.commission_income, 0) - COALESCE(me.business_expenses, 0) - COALESCE(me.personal_expenses, 0) as net_income
FROM monthly_commission mc
FULL OUTER JOIN monthly_expenses me ON mc.year_earned = me.year_incurred AND mc.month_earned = me.month_incurred
WHERE COALESCE(mc.year_earned, me.year_incurred) >= EXTRACT(YEAR FROM CURRENT_DATE) - 1
ORDER BY year DESC, month DESC;

-- Commission pipeline analysis
SELECT
  'Pipeline Analysis' as metric,
  SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commissions,
  SUM(CASE WHEN status = 'expected' THEN commission_amount ELSE 0 END) as expected_commissions,
  SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as paid_commissions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'expected' THEN 1 END) as expected_count,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
FROM commissions
WHERE year_earned = EXTRACT(YEAR FROM CURRENT_DATE);

-- =============================================================================
-- GOAL TRACKING QUERIES
-- =============================================================================

-- Progress toward annual targets
WITH targets AS (
  SELECT
    (SELECT value FROM constants WHERE key = 'target1') as target1,
    (SELECT value FROM constants WHERE key = 'target2') as target2
),
ytd_performance AS (
  SELECT
    SUM(commission_amount) as ytd_commission,
    SUM(annual_premium) as ytd_premium,
    COUNT(*) as ytd_policies
  FROM commissions
  WHERE year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
    AND status IN ('paid', 'expected')
)
SELECT
  t.target1,
  t.target2,
  yp.ytd_commission,
  yp.ytd_premium,
  yp.ytd_policies,
  ROUND(yp.ytd_commission / t.target1 * 100, 2) as target1_progress_percent,
  ROUND(yp.ytd_commission / t.target2 * 100, 2) as target2_progress_percent,
  t.target1 - yp.ytd_commission as target1_remaining,
  t.target2 - yp.ytd_commission as target2_remaining
FROM targets t, ytd_performance yp;

-- Monthly pace toward annual goal
WITH monthly_avg AS (
  SELECT
    AVG(monthly_commission) as avg_monthly_commission
  FROM (
    SELECT
      SUM(commission_amount) as monthly_commission
    FROM commissions
    WHERE year_earned = EXTRACT(YEAR FROM CURRENT_DATE)
      AND status IN ('paid', 'expected')
    GROUP BY month_earned
  ) monthly_totals
),
targets AS (
  SELECT
    (SELECT value FROM constants WHERE key = 'target1') as target1,
    (SELECT value FROM constants WHERE key = 'target2') as target2
)
SELECT
  ma.avg_monthly_commission,
  ma.avg_monthly_commission * 12 as projected_annual,
  t.target1,
  t.target2,
  ROUND((ma.avg_monthly_commission * 12) / t.target1 * 100, 2) as target1_pace_percent,
  ROUND((ma.avg_monthly_commission * 12) / t.target2 * 100, 2) as target2_pace_percent
FROM monthly_avg ma, targets t;

-- =============================================================================
-- COMMISSION CALCULATION HELPERS
-- =============================================================================

-- Function to auto-calculate commission for new policy
CREATE OR REPLACE FUNCTION auto_calculate_commission(
  p_policy_id UUID,
  p_agent_id UUID,
  p_carrier_id UUID,
  p_product_name VARCHAR,
  p_annual_premium DECIMAL,
  p_advance_months INTEGER DEFAULT 9
) RETURNS TABLE (
  commission_rate DECIMAL(6,3),
  commission_amount DECIMAL(12,2),
  comp_guide_id UUID,
  is_auto_calculated BOOLEAN
) AS $$
DECLARE
  agent_contract_level INTEGER;
  calculated_rate DECIMAL(6,3);
  guide_id UUID;
  monthly_premium DECIMAL(12,2);
BEGIN
  -- Get agent's contract comp level
  SELECT contract_comp_level INTO agent_contract_level
  FROM agents WHERE id = p_agent_id;

  -- Calculate monthly premium
  monthly_premium := p_annual_premium / 12;

  -- Look up commission rate from comp guide
  SELECT cg.commission_percentage, cg.id
  INTO calculated_rate, guide_id
  FROM comp_guide cg
  WHERE cg.carrier_id = p_carrier_id
    AND cg.product_name = p_product_name
    AND cg.contract_level = agent_contract_level
    AND cg.is_active = true
    AND (cg.expiration_date IS NULL OR cg.expiration_date > CURRENT_DATE)
    AND cg.effective_date <= CURRENT_DATE
  ORDER BY cg.effective_date DESC
  LIMIT 1;

  -- Return results
  commission_rate := COALESCE(calculated_rate, 0);
  commission_amount := calculate_commission_amount(monthly_premium, p_advance_months, commission_rate);
  comp_guide_id := guide_id;
  is_auto_calculated := (guide_id IS NOT NULL);

  RETURN QUERY SELECT commission_rate, commission_amount, comp_guide_id, is_auto_calculated;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================================================

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table statistics
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Most expensive queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%commissions%' OR query LIKE '%policies%'
ORDER BY mean_time DESC
LIMIT 10;