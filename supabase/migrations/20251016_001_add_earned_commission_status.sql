-- supabase/migrations/20251016_001_add_earned_commission_status.sql
-- Add 'earned' status to commission lifecycle
--
-- PURPOSE:
--   Separate "policy active" from "commission paid"
--   - pending: Policy not active yet
--   - earned: Policy active, commission entitled but not paid yet
--   - paid: Money actually received in bank account
--
-- CHANGES:
--   1. Add 'earned' to commission status enum
--   2. Update trigger to set status='earned' when policy becomes active
--   3. Add mark_commission_as_paid() function for UI to call
--   4. Existing 'paid' records are preserved (grandfathered)

BEGIN;

-- =====================================================
-- STEP 1: Add 'earned' status (if not already exists)
-- =====================================================

-- Note: PostgreSQL doesn't have ALTER TYPE ADD VALUE IF NOT EXISTS before v12
-- We'll check if it exists first
DO $$
BEGIN
    -- Check if we need to add the 'earned' value
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'earned'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'commission_status'
        )
    ) THEN
        -- If commission_status is an enum type, alter it
        BEGIN
            ALTER TYPE commission_status ADD VALUE 'earned';
            RAISE NOTICE 'Added earned status to commission_status enum';
        EXCEPTION
            WHEN OTHERS THEN
                -- If it's a varchar, we don't need to do anything
                RAISE NOTICE 'commission_status is not an enum type, skipping';
        END;
    END IF;
END $$;

-- =====================================================
-- STEP 2: Update auto_create_commission_record function
-- =====================================================

-- Replace the function to use 'earned' instead of 'paid' when policy is active
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_advance_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER := 9; -- Always use 9 months (industry standard)
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Get user's contract level from user metadata (fallback to 1.0)
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users
      WHERE id = NEW.user_id
    ),
    1.0
  );

  -- Calculate advance: Monthly Premium × 9 Months × Commission % × Contract Level
  v_advance_amount := (NEW.monthly_premium * v_advance_months * NEW.commission_percentage * v_contract_level);

  -- Only create commission record if amount > 0 and no commission exists
  IF v_advance_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
    INSERT INTO commissions (
      user_id,
      policy_id,
      carrier_id,
      commission_amount,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      status,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.carrier_id,
      v_advance_amount,
      v_advance_months,
      0, -- No months paid yet
      0, -- Nothing earned yet (trigger will calculate)
      v_advance_amount, -- All unearned initially (trigger will calculate)
      CASE
        WHEN NEW.status = 'active' THEN 'earned'  -- ✅ CHANGED: Use 'earned' instead of 'paid'
        ELSE 'pending'
      END,
      'Auto-generated advance for policy ' || NEW.policy_number
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_commission_record IS
'Auto-creates commission advance (9-month) when new policy is inserted. Uses earned status when policy is active.';

-- =====================================================
-- STEP 3: Update policy status change trigger
-- =====================================================

-- When policy status changes, update commission status accordingly
CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When policy becomes active, set commission to 'earned' (not 'paid')
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    UPDATE commissions
    SET
      status = 'earned',  -- ✅ CHANGED: Use 'earned' instead of 'paid'
      updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status = 'pending';  -- Only update if currently pending

  -- When policy is cancelled or lapsed, mark commission as cancelled
  ELSIF NEW.status IN ('cancelled', 'lapsed') AND OLD.status NOT IN ('cancelled', 'lapsed') THEN
    UPDATE commissions
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status IN ('pending', 'earned');  -- Cancel if not yet paid
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_commission_on_policy_status IS
'Updates commission status when policy status changes. Active policies get earned status.';

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_commission_status ON policies;
CREATE TRIGGER trigger_update_commission_status
  AFTER UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_commission_on_policy_status();

-- =====================================================
-- STEP 4: Create mark_commission_as_paid function
-- =====================================================

CREATE OR REPLACE FUNCTION mark_commission_as_paid(
  p_commission_id UUID,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_commission RECORD;
  v_policy RECORD;
  v_result JSONB;
BEGIN
  -- Get commission details
  SELECT * INTO v_commission
  FROM commissions
  WHERE id = p_commission_id;

  -- Validate commission exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Commission not found',
      'error_code', 'COMMISSION_NOT_FOUND'
    );
  END IF;

  -- Validate commission status is 'earned'
  IF v_commission.status != 'earned' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot mark commission as paid. Current status is %s. Must be earned.', v_commission.status),
      'error_code', 'INVALID_STATUS',
      'current_status', v_commission.status
    );
  END IF;

  -- Get linked policy
  SELECT * INTO v_policy
  FROM policies
  WHERE id = v_commission.policy_id;

  -- Validate policy exists and is active
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Linked policy not found',
      'error_code', 'POLICY_NOT_FOUND'
    );
  END IF;

  IF v_policy.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Cannot mark commission as paid. Policy status is %s. Must be active.', v_policy.status),
      'error_code', 'POLICY_NOT_ACTIVE',
      'policy_status', v_policy.status
    );
  END IF;

  -- Update commission to paid
  UPDATE commissions
  SET
    status = 'paid',
    payment_date = p_payment_date,
    updated_at = NOW()
  WHERE id = p_commission_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'commission_id', p_commission_id,
    'payment_date', p_payment_date,
    'message', 'Commission marked as paid successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'UNKNOWN_ERROR'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_commission_as_paid IS
'Marks an earned commission as paid. Validates commission status is earned and policy is active.';

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
DECLARE
  v_pending_count INTEGER;
  v_earned_count INTEGER;
  v_paid_count INTEGER;
BEGIN
  -- Count commissions by status
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'earned'),
    COUNT(*) FILTER (WHERE status = 'paid')
  INTO v_pending_count, v_earned_count, v_paid_count
  FROM commissions;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Commission Payment Tracking Migration Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Status Summary:';
  RAISE NOTICE '  - Pending: % commissions', v_pending_count;
  RAISE NOTICE '  - Earned: % commissions', v_earned_count;
  RAISE NOTICE '  - Paid: % commissions (grandfathered)', v_paid_count;
  RAISE NOTICE '';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '  ✓ Added earned status';
  RAISE NOTICE '  ✓ Updated triggers to use earned (not paid)';
  RAISE NOTICE '  ✓ Created mark_commission_as_paid() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Lifecycle: pending → earned → paid';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;
