-- supabase/migrations/20260102_010_create_capped_overage_trigger.sql
-- Creates "capped_overage" commission records when a capped advance reaches overage_start_month
--
-- Business Rule:
-- - Some carriers have advance caps (e.g., Mutual of Omaha = $3,000)
-- - When calculated advance exceeds cap, overage is stored in overage_amount
-- - Overage is paid monthly starting at overage_start_month
-- - overage_start_month = (advance_cap / monthly_earning_rate) + 1
-- - Each overage record = monthly_premium × comp_rate (1 month of commission)
-- - Overage payments continue until overage_amount is depleted

-- ============================================================================
-- PART 1: Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_capped_overage_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_policy RECORD;
  v_comp_guide_rate DECIMAL(5,4);
  v_monthly_overage_amount DECIMAL(12,2);
  v_remaining_overage DECIMAL(12,2);
  v_total_paid_overage DECIMAL(12,2);
  v_existing_count INTEGER;
  v_month INTEGER;
BEGIN
  -- Only process when months_paid increases
  IF OLD.months_paid >= NEW.months_paid THEN
    RETURN NEW;
  END IF;

  -- Only process advance commission types with overage
  IF NEW.type != 'advance' THEN
    RETURN NEW;
  END IF;

  -- Only process commissions with capped overage
  IF NEW.overage_amount IS NULL OR NEW.overage_amount <= 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.overage_start_month IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only process active commissions (not cancelled/charged_back)
  IF NEW.status IN ('cancelled', 'charged_back', 'clawback') THEN
    RETURN NEW;
  END IF;

  -- Get the policy details
  SELECT p.*, up.contract_level
  INTO v_policy
  FROM policies p
  LEFT JOIN user_profiles up ON up.id = p.user_id
  WHERE p.id = NEW.policy_id;

  IF v_policy IS NULL THEN
    RAISE WARNING 'Policy % not found for commission % - skipping overage creation',
      NEW.policy_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Get commission rate from comp_guide
  SELECT commission_percentage
  INTO v_comp_guide_rate
  FROM comp_guide
  WHERE carrier_id = v_policy.carrier_id
    AND (product_id = v_policy.product_id OR product_type = v_policy.product)
    AND contract_level = v_policy.contract_level
    AND effective_date <= v_policy.effective_date
    AND (expiration_date IS NULL OR expiration_date >= v_policy.effective_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_comp_guide_rate IS NULL THEN
    -- Fall back to policy's commission_percentage if no comp_guide entry
    v_comp_guide_rate := v_policy.commission_percentage;
  END IF;

  IF v_comp_guide_rate IS NULL THEN
    RAISE WARNING 'No commission rate found for policy % - skipping overage creation',
      v_policy.id;
    RETURN NEW;
  END IF;

  -- Calculate monthly overage amount: monthly_premium × comp_rate
  v_monthly_overage_amount := v_policy.monthly_premium * v_comp_guide_rate;

  -- Calculate how much overage has already been paid
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid_overage
  FROM commissions
  WHERE related_advance_id = NEW.id
    AND type = 'capped_overage';

  v_remaining_overage := NEW.overage_amount - v_total_paid_overage;

  -- Loop through months from overage_start_month through 12
  -- (overage can continue past month 12 if needed, but typically ends there)
  FOR v_month IN NEW.overage_start_month..12 LOOP
    -- Check if we just crossed this month threshold
    IF OLD.months_paid < v_month AND NEW.months_paid >= v_month THEN

      -- Stop if no remaining overage
      IF v_remaining_overage <= 0 THEN
        EXIT;
      END IF;

      -- Check if we already created this month's overage record
      SELECT COUNT(*) INTO v_existing_count
      FROM commissions
      WHERE related_advance_id = NEW.id
        AND month_number = v_month
        AND type = 'capped_overage';

      IF v_existing_count > 0 THEN
        -- Already exists, skip
        CONTINUE;
      END IF;

      -- Calculate amount for this month (min of monthly rate and remaining overage)
      v_monthly_overage_amount := LEAST(
        v_policy.monthly_premium * v_comp_guide_rate,
        v_remaining_overage
      );

      -- Create the capped_overage commission record
      INSERT INTO commissions (
        policy_id,
        user_id,
        imo_id,
        amount,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        status,
        type,
        related_advance_id,
        month_number,
        created_at
      ) VALUES (
        NEW.policy_id,
        NEW.user_id,
        NEW.imo_id,
        v_monthly_overage_amount,
        1,  -- overage is for 1 month at a time
        1,  -- Considered fully paid/earned immediately
        v_monthly_overage_amount,  -- Fully earned
        0,  -- No unearned portion
        'earned',  -- Immediately earned
        'capped_overage',
        NEW.id,  -- Link to parent advance
        v_month,  -- Track which month
        NOW()
      );

      -- Update remaining overage for next iteration
      v_remaining_overage := v_remaining_overage - v_monthly_overage_amount;

      RAISE NOTICE 'Created capped_overage commission for policy %, month %, amount %, remaining %',
        NEW.policy_id, v_month, v_monthly_overage_amount, v_remaining_overage;

    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_capped_overage_commission() IS
'Creates "capped_overage" commission records when months_paid reaches overage_start_month.
Formula: monthly_premium × comp_rate (from comp_guide), limited by remaining overage
Triggered: AFTER UPDATE of months_paid on commissions table
Business Rule: When carrier has advance cap, overage is paid monthly after recoupment.';

-- ============================================================================
-- PART 2: Create the trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_capped_overage_commission ON commissions;

CREATE TRIGGER trigger_create_capped_overage_commission
  AFTER UPDATE OF months_paid ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION create_capped_overage_commission();

-- ============================================================================
-- PART 3: Add index for efficient lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_commissions_capped_overage
ON commissions(type, month_number)
WHERE type = 'capped_overage';
