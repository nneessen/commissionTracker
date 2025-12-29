-- supabase/migrations/20251229_005_create_as_earned_commission_trigger.sql
-- Creates "as_earned" commission records for months 10, 11, 12 when a policy reaches those months
--
-- Business Rule:
-- - Insurance advances cover months 1-9 (paid upfront)
-- - Months 10, 11, 12 are "as earned" - paid monthly as the client pays
-- - Each as_earned record = monthly_premium × comp_rate (1 month of commission)

-- ============================================================================
-- PART 1: Add columns to track as-earned records
-- ============================================================================

-- Add related_advance_id to link as-earned records to their parent advance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commissions' AND column_name = 'related_advance_id'
  ) THEN
    ALTER TABLE commissions ADD COLUMN related_advance_id UUID REFERENCES commissions(id);
  END IF;
END $$;

-- Add month_number to track which month (10, 11, or 12) for as-earned records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commissions' AND column_name = 'month_number'
  ) THEN
    ALTER TABLE commissions ADD COLUMN month_number INTEGER;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Create the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_as_earned_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_policy RECORD;
  v_comp_guide_rate DECIMAL(5,4);
  v_as_earned_amount DECIMAL(12,2);
  v_existing_count INTEGER;
  v_month INTEGER;
BEGIN
  -- Only process when months_paid increases
  IF OLD.months_paid >= NEW.months_paid THEN
    RETURN NEW;
  END IF;

  -- Only process advance commission types (not as_earned or other types)
  IF NEW.type != 'advance' THEN
    RETURN NEW;
  END IF;

  -- Only process active commissions (not cancelled/charged_back)
  IF NEW.status IN ('cancelled', 'charged_back', 'clawback') THEN
    RETURN NEW;
  END IF;

  -- Loop through any months that crossed the threshold (10, 11, 12)
  FOR v_month IN 10..12 LOOP
    -- Check if we just crossed this month threshold
    IF OLD.months_paid < v_month AND NEW.months_paid >= v_month THEN

      -- Check if we already created this month's as_earned record
      SELECT COUNT(*) INTO v_existing_count
      FROM commissions
      WHERE related_advance_id = NEW.id
        AND month_number = v_month
        AND type = 'as_earned';

      IF v_existing_count > 0 THEN
        -- Already exists, skip
        CONTINUE;
      END IF;

      -- Get the policy details
      SELECT p.*, up.contract_level
      INTO v_policy
      FROM policies p
      LEFT JOIN user_profiles up ON up.id = p.user_id
      WHERE p.id = NEW.policy_id;

      IF v_policy IS NULL THEN
        RAISE WARNING 'Policy % not found for commission % - skipping as_earned creation for month %',
          NEW.policy_id, NEW.id, v_month;
        CONTINUE;
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
        RAISE WARNING 'No commission rate found for policy % - skipping as_earned creation for month %',
          v_policy.id, v_month;
        CONTINUE;
      END IF;

      -- Calculate as_earned amount: monthly_premium × comp_rate
      -- Note: comp_guide rates are stored as decimals (e.g., 0.95 = 95%)
      v_as_earned_amount := v_policy.monthly_premium * v_comp_guide_rate;

      -- Create the as_earned commission record
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
        v_as_earned_amount,
        1,  -- as_earned is for 1 month
        1,  -- Considered fully paid/earned immediately
        v_as_earned_amount,  -- Fully earned
        0,  -- No unearned portion
        'earned',  -- Immediately earned
        'as_earned',
        NEW.id,  -- Link to parent advance
        v_month,  -- Track which month
        NOW()
      );

      RAISE NOTICE 'Created as_earned commission for policy %, month %, amount %',
        NEW.policy_id, v_month, v_as_earned_amount;

    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_as_earned_commission() IS
'Creates "as_earned" commission records for months 10, 11, 12 when months_paid reaches those values.
Formula: monthly_premium × comp_rate (from comp_guide)
Triggered: AFTER UPDATE of months_paid on commissions table
Business Rule: Advances cover months 1-9, months 10-12 are paid as earned.';

-- ============================================================================
-- PART 3: Create the trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_as_earned_commission ON commissions;

CREATE TRIGGER trigger_create_as_earned_commission
  AFTER UPDATE OF months_paid ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION create_as_earned_commission();

-- ============================================================================
-- PART 4: Add index for efficient lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_commissions_related_advance_id
ON commissions(related_advance_id)
WHERE related_advance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_type_month
ON commissions(type, month_number)
WHERE type = 'as_earned';
