-- supabase/migrations/20251018_001_enhance_commission_chargeback_trigger.sql
-- Enhanced Chargeback Automation for Commission Lifecycle
--
-- PURPOSE:
--   Automatically calculate and apply chargebacks when policies cancel/lapse
--   Calculate months_paid from effective_date
--   Populate chargeback_amount, chargeback_date, chargeback_reason
--
-- BUSINESS RULES:
--   - Chargeback = Advance - Earned
--   - Earned = (Advance / Advance Months) × Months Paid
--   - Months Paid = FLOOR(MONTHS_BETWEEN(cancellation_date, effective_date))
--   - If months_paid >= advance_months, no chargeback (fully earned)
--
-- CHANGES:
--   1. Add calculate_months_paid() helper function
--   2. Add calculate_chargeback_on_policy_lapse() function
--   3. Enhance update_commission_on_policy_status() to call chargeback calculation
--   4. Add 'charged_back' status to commission_status enum

BEGIN;

-- =====================================================
-- STEP 1: Add 'charged_back' status to enum (if not exists)
-- =====================================================

DO $$
BEGIN
    -- Check if we need to add the 'charged_back' value
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'charged_back'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'commission_status'
        )
    ) THEN
        -- If commission_status is an enum type, alter it
        BEGIN
            ALTER TYPE commission_status ADD VALUE 'charged_back';
            RAISE NOTICE 'Added charged_back status to commission_status enum';
        EXCEPTION
            WHEN OTHERS THEN
                -- If it's a varchar, we don't need to do anything
                RAISE NOTICE 'commission_status is not an enum type, skipping';
        END;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Helper function to calculate months paid
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_months_paid(
  p_effective_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_months_paid INTEGER;
BEGIN
  -- Validate inputs
  IF p_effective_date IS NULL THEN
    RETURN 0;
  END IF;

  IF p_end_date IS NULL THEN
    p_end_date := CURRENT_DATE;
  END IF;

  -- Calculate months elapsed (round down)
  v_months_paid := FLOOR(
    EXTRACT(YEAR FROM AGE(p_end_date, p_effective_date)) * 12 +
    EXTRACT(MONTH FROM AGE(p_end_date, p_effective_date))
  );

  -- Ensure non-negative
  v_months_paid := GREATEST(0, v_months_paid);

  RETURN v_months_paid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_months_paid IS
'Calculate number of months paid based on effective_date and end_date. Returns 0 if dates are invalid.';

-- =====================================================
-- STEP 3: Chargeback calculation function
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
      v_commission.advance_amount / v_commission.advance_months
    ELSE 0
  END;

  -- Calculate earned amount
  v_earned_amount := v_monthly_earning_rate * v_months_paid;

  -- Calculate chargeback amount (advance - earned)
  v_chargeback_amount := v_commission.advance_amount - v_earned_amount;

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
    'advance_amount', v_commission.advance_amount,
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
'Calculate and apply chargeback when a policy lapses or is cancelled. Automatically updates commission record with chargeback details.';

-- =====================================================
-- STEP 4: Enhanced policy status change trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER AS $$
DECLARE
  v_chargeback_result JSONB;
BEGIN
  -- When policy becomes active, set commission to 'earned' (not 'paid')
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE commissions
    SET
      status = 'earned',
      updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status = 'pending';  -- Only update if currently pending

  -- When policy is cancelled or lapsed, calculate chargeback automatically
  ELSIF NEW.status IN ('cancelled', 'lapsed') AND OLD.status NOT IN ('cancelled', 'lapsed') THEN

    -- Call chargeback calculation function
    v_chargeback_result := calculate_chargeback_on_policy_lapse(
      NEW.id,
      CURRENT_DATE
    );

    -- Log the result
    IF (v_chargeback_result->>'success')::BOOLEAN THEN
      RAISE NOTICE 'Chargeback processed for policy %: %',
        NEW.id,
        v_chargeback_result->>'chargeback_reason';
    ELSE
      RAISE WARNING 'Chargeback calculation failed for policy %: %',
        NEW.id,
        v_chargeback_result->>'error';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_commission_on_policy_status IS
'Enhanced trigger: Updates commission status when policy status changes AND automatically calculates chargebacks for cancelled/lapsed policies.';

-- Recreate trigger (will replace existing one)
DROP TRIGGER IF EXISTS trigger_update_commission_status ON policies;
CREATE TRIGGER trigger_update_commission_status
  AFTER UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_commission_on_policy_status();

-- =====================================================
-- STEP 5: Create chargeback summary view
-- =====================================================

CREATE OR REPLACE VIEW commission_chargeback_summary AS
SELECT
  c.user_id,
  COUNT(*) FILTER (WHERE c.chargeback_amount > 0) as total_chargebacks,
  SUM(c.chargeback_amount) as total_chargeback_amount,
  SUM(c.advance_amount) as total_advances,
  SUM(c.earned_amount) as total_earned,
  ROUND(
    (SUM(c.chargeback_amount) / NULLIF(SUM(c.advance_amount), 0)) * 100,
    2
  ) as chargeback_rate_percentage,
  COUNT(*) FILTER (WHERE c.status = 'charged_back') as charged_back_count,
  COUNT(*) FILTER (WHERE c.status IN ('pending', 'earned') AND c.months_paid < 3) as high_risk_count,
  SUM(c.unearned_amount) FILTER (WHERE c.status IN ('pending', 'earned')) as at_risk_amount
FROM commissions c
GROUP BY c.user_id;

COMMENT ON VIEW commission_chargeback_summary IS
'Aggregate chargeback metrics by user: total chargebacks, rates, at-risk amounts';

-- =====================================================
-- STEP 6: Create at-risk commissions function
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
    c.advance_amount,
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
'Get list of at-risk commissions (low months_paid, high unearned amounts) for reporting';

-- =====================================================
-- STEP 7: Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_commissions_chargeback_amount
  ON commissions(chargeback_amount) WHERE chargeback_amount > 0;

CREATE INDEX IF NOT EXISTS idx_commissions_status_months_paid
  ON commissions(status, months_paid);

CREATE INDEX IF NOT EXISTS idx_policies_status_effective_date
  ON policies(status, effective_date);

-- =====================================================
-- STEP 8: Verification and summary
-- =====================================================

DO $$
DECLARE
  v_total_commissions INTEGER;
  v_total_chargebacks INTEGER;
  v_total_chargeback_amount DECIMAL;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE chargeback_amount > 0),
    COALESCE(SUM(chargeback_amount), 0)
  INTO v_total_commissions, v_total_chargebacks, v_total_chargeback_amount
  FROM commissions;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Enhanced Chargeback Automation - Migration Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total commissions: %', v_total_commissions;
  RAISE NOTICE 'Existing chargebacks: %', v_total_chargebacks;
  RAISE NOTICE 'Total chargeback amount: $%', v_total_chargeback_amount;
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  ✓ Added charged_back status';
  RAISE NOTICE '  ✓ Created calculate_months_paid() helper';
  RAISE NOTICE '  ✓ Created calculate_chargeback_on_policy_lapse() function';
  RAISE NOTICE '  ✓ Enhanced trigger to auto-calculate chargebacks';
  RAISE NOTICE '  ✓ Created commission_chargeback_summary view';
  RAISE NOTICE '  ✓ Created get_at_risk_commissions() function';
  RAISE NOTICE '  ✓ Added performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Test chargeback calculation with sample policy cancellations';
  RAISE NOTICE '  2. Deploy service layer changes (CommissionStatusService)';
  RAISE NOTICE '  3. Deploy frontend UI for policy cancellation';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;
