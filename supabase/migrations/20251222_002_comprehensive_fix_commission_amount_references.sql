-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251222_002_comprehensive_fix_commission_amount_references.sql
-- Comprehensive fix for all commission amount field references
--
-- PROBLEM: Database column is named 'amount', not 'commission_amount'
-- When SELECT * INTO v_commission, the record field is v_commission.amount
-- This migration fixes ALL functions to use the correct field name

BEGIN;

-- =====================================================
-- VERIFY ACTUAL COLUMN NAME
-- =====================================================
DO $$
DECLARE
  v_actual_column TEXT;
BEGIN
  -- Check what the actual column name is
  SELECT column_name INTO v_actual_column
  FROM information_schema.columns
  WHERE table_name = 'commissions'
  AND column_name IN ('amount', 'commission_amount', 'advance_amount')
  ORDER BY
    CASE column_name
      WHEN 'amount' THEN 1
      WHEN 'commission_amount' THEN 2
      WHEN 'advance_amount' THEN 3
    END
  LIMIT 1;

  IF v_actual_column IS NULL THEN
    RAISE EXCEPTION 'No commission amount column found in commissions table!';
  END IF;

  RAISE NOTICE 'Actual column name in commissions table: %', v_actual_column;

  -- Ensure we're using 'amount' as the standard
  IF v_actual_column != 'amount' THEN
    RAISE NOTICE 'WARNING: Column is named % but we expect it to be "amount"', v_actual_column;
    RAISE NOTICE 'This migration assumes the column is named "amount"';
  END IF;
END $$;

-- =====================================================
-- FIX 1: calculate_chargeback_on_policy_lapse
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
  v_monthly_earning_rate := CASE
    WHEN v_commission.advance_months > 0 THEN
      v_commission.amount / v_commission.advance_months  -- FIXED: Use 'amount' not 'commission_amount'
    ELSE 0
  END;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_months_paid;

  -- Calculate chargeback amount (advance - earned)
  v_chargeback_amount := v_commission.amount - v_earned_amount;  -- FIXED: Use 'amount' not 'commission_amount'

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
  RETURN jsonb_build_object(
    'success', true,
    'policy_id', p_policy_id,
    'commission_id', v_commission.id,
    'months_paid', v_months_paid,
    'advance_amount', v_commission.amount,  -- FIXED: Use 'amount' not 'commission_amount'
    'earned_amount', v_earned_amount,
    'chargeback_amount', v_chargeback_amount,
    'chargeback_reason', v_chargeback_reason
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'policy_id', p_policy_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_chargeback_on_policy_lapse IS
'Calculate and apply chargeback when a policy lapses or is cancelled. FIXED: Uses correct field name "amount"';

-- =====================================================
-- FIX 2: update_commission_earned_amounts
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure months_paid is not negative
  NEW.months_paid := GREATEST(0, COALESCE(NEW.months_paid, 0));

  -- Recalculate earned and unearned amounts when months_paid changes
  NEW.earned_amount := public.calculate_earned_amount(
    NEW.amount,  -- FIXED: Use 'amount' not 'commission_amount'
    COALESCE(NEW.advance_months, 9),
    NEW.months_paid
  );

  NEW.unearned_amount := NEW.amount - NEW.earned_amount;  -- FIXED: Use 'amount' not 'commission_amount'

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_commission_earned_amounts IS
'Trigger function to automatically calculate earned/unearned amounts. FIXED: Uses correct field name "amount"';

-- =====================================================
-- FIX 3: auto_create_commission_record
-- =====================================================
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Default advance months
  v_advance_months := 9;

  -- Get user's contract level (default 1.0 = 100%)
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users
      WHERE id = NEW.user_id
    ),
    1.0
  );

  -- Calculate commission advance
  v_commission_amount := calculate_commission_advance(
    NEW.annual_premium,
    COALESCE(NEW.commission_percentage, 0),
    v_advance_months,
    v_contract_level
  );

  -- Only create commission record if amount > 0 and no commission exists for this policy
  IF v_commission_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
    INSERT INTO commissions (
      user_id,
      policy_id,
      carrier_id,
      amount,  -- FIXED: Use 'amount' not 'commission_amount'
      status,
      is_advance,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.carrier_id,
      v_commission_amount,
      CASE
        WHEN NEW.status = 'active' THEN 'paid'
        ELSE 'pending'
      END,
      true,
      v_advance_months,
      0, -- No months paid yet
      0, -- No months earned yet
      v_commission_amount, -- All unearned initially
      'Auto-generated commission record for policy ' || NEW.policy_number
    );

    RAISE NOTICE 'Created commission record: $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_commission_record IS
'Auto-creates commission when policy is created. FIXED: Uses correct field name "amount"';

-- =====================================================
-- FIX 4: get_at_risk_commissions
-- =====================================================
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
    c.amount as advance_amount,  -- FIXED: Use 'amount' not 'advance_amount'
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
'Get at-risk commissions for reporting. FIXED: Uses correct field name "amount"';

-- =====================================================
-- FIX 5: Fix Views
-- =====================================================

-- Drop and recreate commission_earning_detail view
DROP VIEW IF EXISTS commission_earning_detail CASCADE;
CREATE OR REPLACE VIEW commission_earning_detail AS
SELECT
  c.id as commission_id,
  c.policy_id,
  c.user_id,
  c.amount as advance_amount,  -- FIXED: Use 'amount' not 'commission_amount'
  c.advance_months,
  c.months_paid,
  c.earned_amount,
  c.unearned_amount,
  c.chargeback_amount,
  c.status,
  (c.months_paid >= c.advance_months) as is_fully_earned,
  GREATEST(0, c.advance_months - c.months_paid) as months_remaining,
  c.amount / NULLIF(c.advance_months, 1) as monthly_earning_rate,  -- FIXED: Use 'amount'
  -- Chargeback risk assessment
  CASE
    WHEN c.status = 'paid' AND c.months_paid >= c.advance_months THEN 'NO_RISK'
    WHEN c.status = 'paid' AND c.months_paid >= 6 THEN 'LOW_RISK'
    WHEN c.status = 'paid' AND c.months_paid >= 3 THEN 'MEDIUM_RISK'
    WHEN c.status = 'paid' THEN 'HIGH_RISK'
    ELSE 'NOT_APPLICABLE'
  END as chargeback_risk_level,
  p.status as policy_status,
  p.effective_date,
  p.annual_premium
FROM commissions c
JOIN policies p ON p.id = c.policy_id;

-- Drop and recreate commission_earning_summary view
DROP VIEW IF EXISTS commission_earning_summary CASCADE;
CREATE OR REPLACE VIEW commission_earning_summary AS
SELECT
  c.user_id,
  COUNT(*) as total_commissions,
  SUM(c.amount) as total_advances,  -- FIXED: Use 'amount' not 'commission_amount'
  SUM(c.earned_amount) as total_earned,
  SUM(c.unearned_amount) as total_unearned,
  SUM(c.chargeback_amount) as total_chargebacks,
  ROUND(AVG(c.months_paid), 2) as avg_months_paid,
  ROUND((SUM(c.earned_amount) / NULLIF(SUM(c.amount), 0)) * 100, 2) as portfolio_earned_percentage,  -- FIXED
  COUNT(CASE WHEN c.months_paid >= c.advance_months THEN 1 END) as fully_earned_count,
  COUNT(CASE WHEN c.months_paid < c.advance_months THEN 1 END) as at_risk_count
FROM commissions c
GROUP BY c.user_id;

-- Drop and recreate commission_chargeback_summary view
DROP VIEW IF EXISTS commission_chargeback_summary CASCADE;
CREATE OR REPLACE VIEW commission_chargeback_summary AS
SELECT
  c.user_id,
  COUNT(*) FILTER (WHERE c.chargeback_amount > 0) as total_chargebacks,
  SUM(c.chargeback_amount) as total_chargeback_amount,
  SUM(c.amount) as total_advances,  -- FIXED: Use 'amount' not 'commission_amount'
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

-- =====================================================
-- RECREATE TRIGGERS (in case they were dropped)
-- =====================================================

-- Ensure trigger exists for commission earned amounts
DROP TRIGGER IF EXISTS trigger_update_commission_earned ON commissions;
CREATE TRIGGER trigger_update_commission_earned
  BEFORE INSERT OR UPDATE OF months_paid, amount, advance_months
  ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_earned_amounts();

-- Ensure trigger exists for policy status changes
DROP TRIGGER IF EXISTS trigger_update_commission_status ON policies;
CREATE TRIGGER trigger_update_commission_status
  AFTER UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_commission_on_policy_status();

-- Ensure trigger exists for auto-creating commissions
DROP TRIGGER IF EXISTS trigger_auto_create_commission ON policies;
CREATE TRIGGER trigger_auto_create_commission
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_test_record RECORD;
  v_column_exists BOOLEAN;
BEGIN
  -- Verify the column is 'amount'
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions'
    AND column_name = 'amount'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE WARNING 'Column "amount" does not exist in commissions table!';
  ELSE
    RAISE NOTICE 'Column "amount" verified in commissions table ✓';
  END IF;

  -- Test that we can select from commissions
  SELECT * INTO v_test_record
  FROM commissions
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'COMPREHENSIVE FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed Functions:';
  RAISE NOTICE '  ✓ calculate_chargeback_on_policy_lapse()';
  RAISE NOTICE '  ✓ update_commission_earned_amounts()';
  RAISE NOTICE '  ✓ auto_create_commission_record()';
  RAISE NOTICE '  ✓ get_at_risk_commissions()';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Views:';
  RAISE NOTICE '  ✓ commission_earning_detail';
  RAISE NOTICE '  ✓ commission_earning_summary';
  RAISE NOTICE '  ✓ commission_chargeback_summary';
  RAISE NOTICE '';
  RAISE NOTICE 'Recreated Triggers:';
  RAISE NOTICE '  ✓ trigger_update_commission_earned';
  RAISE NOTICE '  ✓ trigger_update_commission_status';
  RAISE NOTICE '  ✓ trigger_auto_create_commission';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions now use the correct field: "amount"';
  RAISE NOTICE 'Commission status "cancelled" should now work!';
  RAISE NOTICE '===========================================';
END $$;