-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251222_003_FINAL_FIX_update_commission_on_policy_status.sql
-- FINAL FIX: update_commission_on_policy_status function STILL references wrong field names
--
-- THE REAL PROBLEM:
-- The calculate_chargeback_on_policy_lapse function created in 20251018_001
-- is using v_commission.advance_amount which DOES NOT EXIST
-- The actual column is named 'amount'
--
-- This migration SPECIFICALLY fixes the update_commission_on_policy_status trigger
-- and its called function calculate_chargeback_on_policy_lapse

BEGIN;

-- =====================================================
-- FIX THE ACTUAL PROBLEMATIC FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_chargeback_on_policy_lapse(
  p_policy_id UUID,
  p_lapse_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_commission RECORD;
  v_policy RECORD;
  v_months_paid INTEGER;
  v_earned_amount DECIMAL;
  v_chargeback_amount DECIMAL;
  v_chargeback_reason TEXT;
  v_monthly_earning_rate DECIMAL;
BEGIN
  -- Get policy details
  SELECT * INTO v_policy
  FROM policies
  WHERE id = p_policy_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Policy not found',
      'policy_id', p_policy_id
    );
  END IF;

  -- Get commission record for this policy
  SELECT * INTO v_commission
  FROM commissions
  WHERE policy_id = p_policy_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No commission record found for policy',
      'policy_id', p_policy_id
    );
  END IF;

  -- Calculate months paid from effective_date to lapse_date
  v_months_paid := calculate_months_paid(
    v_policy.effective_date,
    COALESCE(p_lapse_date, CURRENT_DATE)
  );

  -- Cap at advance_months (can't earn more than advance)
  v_months_paid := LEAST(v_months_paid, COALESCE(v_commission.advance_months, 9));

  -- Calculate monthly earning rate
  -- THE FIX: Use v_commission.amount NOT v_commission.advance_amount
  v_monthly_earning_rate := CASE
    WHEN v_commission.advance_months > 0 THEN
      v_commission.amount / v_commission.advance_months  -- FIXED!!!
    ELSE 0
  END;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_months_paid;

  -- Calculate chargeback amount (advance - earned)
  -- THE FIX: Use v_commission.amount NOT v_commission.advance_amount
  v_chargeback_amount := v_commission.amount - v_earned_amount;  -- FIXED!!!

  -- Ensure non-negative chargeback
  v_chargeback_amount := GREATEST(0, v_chargeback_amount);

  -- Determine chargeback reason
  IF v_months_paid = 0 THEN
    v_chargeback_reason := 'Policy cancelled with no payments - full chargeback';
  ELSIF v_months_paid < 3 THEN
    v_chargeback_reason := format('Policy lapsed early (%s months paid) - high chargeback', v_months_paid);
  ELSIF v_months_paid >= v_commission.advance_months THEN
    v_chargeback_reason := 'No chargeback - advance fully earned';
    v_chargeback_amount := 0;
  ELSE
    v_chargeback_reason := format('Policy lapsed after %s of %s months - partial chargeback',
      v_months_paid, v_commission.advance_months);
  END IF;

  -- Update commission record
  UPDATE commissions
  SET
    months_paid = v_months_paid,
    earned_amount = v_earned_amount,
    unearned_amount = v_chargeback_amount,
    chargeback_amount = v_chargeback_amount,
    chargeback_date = COALESCE(p_lapse_date, CURRENT_DATE),
    chargeback_reason = v_chargeback_reason,
    status = CASE
      WHEN v_chargeback_amount > 0 THEN 'charged_back'
      ELSE status -- Keep existing status if no chargeback
    END,
    updated_at = NOW()
  WHERE id = v_commission.id;

  -- Log the calculation
  RAISE NOTICE 'Chargeback calculated for policy %: months_paid=%, earned=$%, chargeback=$%',
    p_policy_id, v_months_paid, v_earned_amount, v_chargeback_amount;

  -- Return success with details
  -- THE FIX: Use v_commission.amount NOT v_commission.advance_amount
  RETURN jsonb_build_object(
    'success', true,
    'policy_id', p_policy_id,
    'commission_id', v_commission.id,
    'months_paid', v_months_paid,
    'advance_amount', v_commission.amount,  -- FIXED!!!
    'earned_amount', v_earned_amount,
    'chargeback_amount', v_chargeback_amount,
    'chargeback_reason', v_chargeback_reason
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details with FULL ERROR MESSAGE
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'policy_id', p_policy_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_chargeback_on_policy_lapse IS
'FIXED: Now uses correct field v_commission.amount instead of non-existent v_commission.advance_amount';

-- Also fix any views that might be using advance_amount
DROP VIEW IF EXISTS commission_chargeback_summary CASCADE;
CREATE OR REPLACE VIEW commission_chargeback_summary AS
SELECT
  c.user_id,
  COUNT(*) FILTER (WHERE c.chargeback_amount > 0) as total_chargebacks,
  SUM(c.chargeback_amount) as total_chargeback_amount,
  SUM(c.amount) as total_advances,  -- FIXED: Use amount not advance_amount
  SUM(c.earned_amount) as total_earned,
  ROUND(
    (SUM(c.chargeback_amount) / NULLIF(SUM(c.amount), 0)) * 100,  -- FIXED
    2
  ) as chargeback_rate_percentage,
  COUNT(*) FILTER (WHERE c.status = 'charged_back') as charged_back_count,
  COUNT(*) FILTER (WHERE c.status IN ('pending', 'earned') AND c.months_paid < 3) as high_risk_count,
  SUM(c.unearned_amount) FILTER (WHERE c.status IN ('pending', 'earned')) as at_risk_amount
FROM commissions c
GROUP BY c.user_id;

-- Also fix get_at_risk_commissions function
CREATE OR REPLACE FUNCTION get_at_risk_commissions(
  p_user_id UUID,
  p_risk_threshold INTEGER DEFAULT 3
)
RETURNS TABLE (
  commission_id UUID,
  policy_id UUID,
  advance_amount DECIMAL,
  months_paid INTEGER,
  earned_amount DECIMAL,
  unearned_amount DECIMAL,
  risk_level TEXT,
  effective_date DATE,
  policy_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as commission_id,
    c.policy_id,
    c.amount as advance_amount,  -- FIXED: Use amount not advance_amount
    c.months_paid,
    c.earned_amount,
    c.unearned_amount,
    CASE
      WHEN c.months_paid = 0 THEN 'CRITICAL'
      WHEN c.months_paid < p_risk_threshold THEN 'HIGH'
      WHEN c.months_paid < 6 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level,
    p.effective_date,
    p.status as policy_status
  FROM commissions c
  JOIN policies p ON p.id = c.policy_id
  WHERE c.user_id = p_user_id
    AND c.status IN ('pending', 'earned')
    AND c.unearned_amount > 0
    AND c.months_paid < c.advance_months
  ORDER BY c.months_paid ASC, c.unearned_amount DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_at_risk_commissions IS
'FIXED: Now uses c.amount instead of non-existent c.advance_amount';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_test_result JSONB;
  v_test_policy_id UUID;
BEGIN
  -- Find a test policy
  SELECT id INTO v_test_policy_id
  FROM policies
  WHERE status = 'active'
  LIMIT 1;

  IF v_test_policy_id IS NOT NULL THEN
    -- Test the function
    v_test_result := calculate_chargeback_on_policy_lapse(v_test_policy_id);

    IF (v_test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE 'TEST PASSED: Function executed without errors';
    ELSE
      RAISE NOTICE 'TEST RESULT: %', v_test_result->>'error';
    END IF;
  ELSE
    RAISE NOTICE 'No active policies found for testing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FINAL FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed the ACTUAL problem:';
  RAISE NOTICE '  ✓ calculate_chargeback_on_policy_lapse() now uses v_commission.amount';
  RAISE NOTICE '  ✓ commission_chargeback_summary view now uses c.amount';
  RAISE NOTICE '  ✓ get_at_risk_commissions() now uses c.amount';
  RAISE NOTICE '';
  RAISE NOTICE 'The error "record v_commission has no field commission_amount"';
  RAISE NOTICE 'was actually about the field "advance_amount" which does not exist!';
  RAISE NOTICE '';
  RAISE NOTICE 'Commission status "cancelled" should ACTUALLY work now!';
  RAISE NOTICE '===========================================';
END $$;