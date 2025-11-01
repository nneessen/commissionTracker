-- Migration: User Commission Rate Calculation System
-- Purpose: Implement accurate commission rate calculations based on comp_guide data
-- Date: 2025-10-31
-- Author: Claude Code

BEGIN;

-- ============================================================================
-- PART 1: Performance Indexes
-- ============================================================================

-- Index for comp_guide lookups by contract level and product
-- Optimizes queries that fetch current commission rates
CREATE INDEX IF NOT EXISTS idx_comp_guide_lookup
  ON comp_guide(contract_level, product_id, effective_date DESC);

-- Index for policies queries when calculating weighted averages
-- Optimizes user's historical product mix calculations
CREATE INDEX IF NOT EXISTS idx_policies_user_product_date
  ON policies(user_id, product_id, effective_date)
  WHERE status = 'active';

-- ============================================================================
-- PART 2: User Commission Profile Calculation Function
-- ============================================================================

-- Function to calculate a user's commission rate profile based on:
-- 1. Their contract level (from users table)
-- 2. Commission rates from comp_guide
-- 3. Their historical product mix (premium-weighted, not count-weighted)
-- 4. Configurable lookback period (default 12 months)

CREATE OR REPLACE FUNCTION get_user_commission_profile(
  p_user_id UUID,
  p_lookback_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  contract_level INTEGER,
  simple_avg_rate NUMERIC,
  weighted_avg_rate NUMERIC,
  product_breakdown JSONB,
  data_quality TEXT,
  calculated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_contract_level INTEGER;
  v_policy_count INTEGER;
  v_total_premium NUMERIC;
BEGIN
  -- ========================================
  -- Step 1: Get user's contract level
  -- ========================================
  SELECT u.contract_comp_level INTO v_contract_level
  FROM users u
  WHERE u.id = p_user_id;

  -- Validate contract level exists
  IF v_contract_level IS NULL THEN
    RAISE EXCEPTION 'User contract level not configured for user_id: %', p_user_id;
  END IF;

  -- ========================================
  -- Step 2: Assess data quality
  -- ========================================
  -- Count recent policies and total premium to determine quality
  SELECT
    COUNT(*),
    COALESCE(SUM(annual_premium), 0)
  INTO v_policy_count, v_total_premium
  FROM policies
  WHERE user_id = p_user_id
    AND effective_date >= CURRENT_DATE - (p_lookback_months || ' months')::INTERVAL
    AND status = 'active';

  -- ========================================
  -- Step 3: Return calculated profile
  -- ========================================
  RETURN QUERY
  WITH current_rates AS (
    -- Get the most recent active commission rate for each product at user's contract level
    -- Uses DISTINCT ON to handle multiple rates per product (due to effective_date changes)
    SELECT DISTINCT ON (cg.product_id)
      cg.product_id,
      p.name as product_name,
      cg.commission_percentage,
      cg.effective_date,
      c.name as carrier_name
    FROM comp_guide cg
    INNER JOIN products p ON cg.product_id = p.id
    INNER JOIN carriers c ON p.carrier_id = c.id
    WHERE cg.contract_level = v_contract_level
      AND cg.effective_date <= CURRENT_DATE
      AND (cg.expiration_date IS NULL OR cg.expiration_date >= CURRENT_DATE)
    ORDER BY cg.product_id, cg.effective_date DESC
  ),
  product_mix AS (
    -- Calculate PREMIUM-WEIGHTED product mix from user's recent sales
    -- CRITICAL: Weight by premium volume, NOT by count
    -- Example: 1 policy @ $10k should outweigh 10 policies @ $500 each
    SELECT
      pol.product_id,
      SUM(pol.annual_premium) as total_premium,
      COUNT(*) as policy_count,
      -- Weight = this product's premium / total premium across all products
      SUM(pol.annual_premium)::NUMERIC /
        NULLIF(SUM(SUM(pol.annual_premium)) OVER (), 0) as premium_weight
    FROM policies pol
    WHERE pol.user_id = p_user_id
      AND pol.effective_date >= CURRENT_DATE - (p_lookback_months || ' months')::INTERVAL
      AND pol.status = 'active'
      AND pol.annual_premium > 0  -- Exclude zero-premium policies
    GROUP BY pol.product_id
  )
  SELECT
    v_contract_level as contract_level,

    -- Simple average: avg of all products at user's contract level
    -- Used as fallback for new agents with no sales history
    (SELECT AVG(commission_percentage)
     FROM current_rates)::NUMERIC(10,6) as simple_avg,

    -- Weighted average: premium-weighted based on user's actual product mix
    -- This is the preferred metric when sufficient data exists
    COALESCE(
      (SELECT SUM(cr.commission_percentage * pm.premium_weight)
       FROM product_mix pm
       INNER JOIN current_rates cr ON pm.product_id = cr.product_id),
      -- Fallback to simple average if no sales history
      (SELECT AVG(commission_percentage) FROM current_rates)
    )::NUMERIC(10,6) as weighted_avg,

    -- Detailed breakdown for transparency
    -- Shows each product, its rate, and how much it contributes to weighted avg
    (SELECT jsonb_agg(
      jsonb_build_object(
        'productId', cr.product_id,
        'productName', cr.product_name,
        'carrierName', cr.carrier_name,
        'commissionRate', cr.commission_percentage,
        'premiumWeight', COALESCE(pm.premium_weight, 0),
        'totalPremium', COALESCE(pm.total_premium, 0),
        'policyCount', COALESCE(pm.policy_count, 0),
        'effectiveDate', cr.effective_date
      )
      ORDER BY COALESCE(pm.premium_weight, 0) DESC  -- Sort by weight (biggest contributors first)
    )
    FROM current_rates cr
    LEFT JOIN product_mix pm ON cr.product_id = pm.product_id
    ) as breakdown,

    -- Data quality indicator
    -- HIGH: 50+ policies or $100k+ premium = very reliable weighted average
    -- MEDIUM: 20+ policies or $40k+ premium = reasonably reliable
    -- LOW: 5+ policies or $10k+ premium = use with caution
    -- INSUFFICIENT: Less than above = use simple average instead
    CASE
      WHEN v_policy_count >= 50 OR v_total_premium >= 100000 THEN 'HIGH'
      WHEN v_policy_count >= 20 OR v_total_premium >= 40000 THEN 'MEDIUM'
      WHEN v_policy_count >= 5 OR v_total_premium >= 10000 THEN 'LOW'
      ELSE 'INSUFFICIENT'
    END as quality,

    NOW() as calc_time;
END;
$$;

-- ============================================================================
-- PART 3: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on comp_guide table
ALTER TABLE comp_guide ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read comp_guide (it's reference data)
CREATE POLICY "comp_guide_public_read" ON comp_guide
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- PART 4: Grants
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_commission_profile(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- PART 5: Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION get_user_commission_profile IS
'Calculates user commission rate profile based on contract level and historical sales mix.
Returns simple average, weighted average, breakdown, and data quality indicator.
Premium-weighted (not count-weighted) for accuracy.';

COMMENT ON INDEX idx_comp_guide_lookup IS
'Optimizes commission rate lookups by contract level and product for current/active rates';

COMMENT ON INDEX idx_policies_user_product_date IS
'Optimizes weighted average calculations based on user product mix';

COMMIT;
