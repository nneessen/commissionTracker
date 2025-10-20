-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251020_002_fix_commission_column_names.sql
-- Fix commission column name issues
--
-- PROBLEM: Multiple migrations have conflicting column names:
-- 1. Table created with `commission_amount`
-- 2. Some migrations reference `amount`
-- 3. Some migrations reference `advance_amount`
--
-- THIS FIX: Standardize on `commission_amount` as the main field name

BEGIN;

-- First, check what column actually exists and fix it
DO $$
BEGIN
  -- Check if we have commission_amount column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions'
    AND column_name = 'commission_amount'
  ) THEN
    RAISE NOTICE 'Found commission_amount column - this is correct';

  -- Check if we have amount column (shouldn't exist but check anyway)
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions'
    AND column_name = 'amount'
  ) THEN
    RAISE NOTICE 'Found amount column - renaming to commission_amount';
    ALTER TABLE commissions RENAME COLUMN amount TO commission_amount;

  -- Check if we have advance_amount column (from failed migrations)
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions'
    AND column_name = 'advance_amount'
  ) THEN
    RAISE NOTICE 'Found advance_amount column - renaming to commission_amount';
    ALTER TABLE commissions RENAME COLUMN advance_amount TO commission_amount;

  ELSE
    RAISE EXCEPTION 'No valid commission amount column found!';
  END IF;
END $$;

-- Now fix the trigger function to use the correct column name
CREATE OR REPLACE FUNCTION public.update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure months_paid is not negative
  NEW.months_paid := GREATEST(0, COALESCE(NEW.months_paid, 0));

  -- Recalculate earned and unearned amounts when months_paid changes
  NEW.earned_amount := public.calculate_earned_amount(
    NEW.commission_amount,  -- Use the correct column name
    COALESCE(NEW.advance_months, 9),
    NEW.months_paid
  );

  NEW.unearned_amount := NEW.commission_amount - NEW.earned_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_commission_earned_amounts IS
'Trigger function to automatically calculate earned/unearned amounts based on months_paid. Uses commission_amount column.';

-- Fix any functions that reference the wrong column name
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
      v_commission.commission_amount / v_commission.advance_months  -- FIX: Use commission_amount
    ELSE 0
  END;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_months_paid;

  -- Calculate chargeback amount (advance - earned)
  v_chargeback_amount := v_commission.commission_amount - v_earned_amount;  -- FIX: Use commission_amount

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
    'advance_amount', v_commission.commission_amount,  -- FIX: Use commission_amount
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

-- Fix the views to use commission_amount
DROP VIEW IF EXISTS commission_earning_detail CASCADE;
CREATE OR REPLACE VIEW commission_earning_detail AS
SELECT
  c.id as commission_id,
  c.policy_id,
  c.user_id,
  c.commission_amount as advance_amount,  -- Use commission_amount
  c.advance_months,
  c.months_paid,
  c.earned_amount,
  c.unearned_amount,
  c.chargeback_amount,
  c.status,
  (c.months_paid >= c.advance_months) as is_fully_earned,
  GREATEST(0, c.advance_months - c.months_paid) as months_remaining,
  c.commission_amount / NULLIF(c.advance_months, 1) as monthly_earning_rate,
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

DROP VIEW IF EXISTS commission_earning_summary CASCADE;
CREATE OR REPLACE VIEW commission_earning_summary AS
SELECT
  c.user_id,
  COUNT(*) as total_commissions,
  SUM(c.commission_amount) as total_advances,  -- Use commission_amount
  SUM(c.earned_amount) as total_earned,
  SUM(c.unearned_amount) as total_unearned,
  SUM(c.chargeback_amount) as total_chargebacks,
  ROUND(AVG(c.months_paid), 2) as avg_months_paid,
  ROUND((SUM(c.earned_amount) / NULLIF(SUM(c.commission_amount), 0)) * 100, 2) as portfolio_earned_percentage,
  COUNT(CASE WHEN c.months_paid >= c.advance_months THEN 1 END) as fully_earned_count,
  COUNT(CASE WHEN c.months_paid < c.advance_months THEN 1 END) as at_risk_count
FROM commissions c
GROUP BY c.user_id;

-- Fix auto_create_commission_record function
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
BEGIN
  -- Only create commission for active policies
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Get user's contract level from user settings
  v_contract_level := COALESCE(
    (SELECT contract_level FROM user_settings WHERE user_id = NEW.user_id),
    1.0
  );

  -- Get advance months from constants or use default
  v_advance_months := COALESCE(
    (SELECT value::INTEGER FROM constants WHERE key = 'default_advance_months' LIMIT 1),
    9
  );

  -- Calculate commission using the function
  v_commission_amount := calculate_commission_advance(
    NEW.annual_premium,
    NEW.commission_percentage,
    v_advance_months,
    v_contract_level
  );

  -- Only create commission record if amount > 0
  IF v_commission_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
    INSERT INTO commissions (
      user_id,
      policy_id,
      carrier_id,
      commission_amount,  -- Use correct column name
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
      CASE WHEN NEW.status = 'active' THEN 'earned' ELSE 'pending' END,
      true,
      v_advance_months,
      0,
      0,
      v_commission_amount,
      'Auto-generated commission for policy ' || NEW.policy_number
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the fix
DO $$
DECLARE
  v_column_name TEXT;
BEGIN
  SELECT column_name INTO v_column_name
  FROM information_schema.columns
  WHERE table_name = 'commissions'
  AND column_name IN ('commission_amount', 'amount', 'advance_amount')
  LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Commission Column Name Fix Applied';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Column name is now: %', v_column_name;
  RAISE NOTICE 'Fixed functions: ';
  RAISE NOTICE '  - update_commission_earned_amounts()';
  RAISE NOTICE '  - calculate_chargeback_on_policy_lapse()';
  RAISE NOTICE '  - auto_create_commission_record()';
  RAISE NOTICE 'Fixed views: ';
  RAISE NOTICE '  - commission_earning_detail';
  RAISE NOTICE '  - commission_earning_summary';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy status cascade should now work correctly!';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;