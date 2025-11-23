-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251222_005_fix_commission_auto_paid_status.sql
-- Fix: Prevent commissions from being automatically marked as 'paid' when policy is created
--
-- PROBLEM:
-- When a policy is created with status='active', the commission is automatically marked as 'paid'
-- This is incorrect because the commission payment might come days/weeks after policy activation
--
-- SOLUTION:
-- Use 'pending' status for all new commissions, regardless of policy status
-- Let users manually mark commissions as 'paid' when they actually receive payment

BEGIN;

-- =====================================================
-- FIX 1: Update auto_create_commission_record function
-- =====================================================
-- This function creates commission records when policies are inserted

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    -- Check if we have all required columns in the correct format
    -- Note: Some migrations use 'type' column, others use 'is_advance'
    -- We'll handle both cases
    BEGIN
      -- Try with 'type' column (newer schema)
      INSERT INTO commissions (
        user_id,
        policy_id,
        amount,
        type,
        status,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        notes
      ) VALUES (
        NEW.user_id,
        NEW.id,
        v_commission_amount,
        'advance',
        'pending',  -- FIXED: Always use 'pending', not 'paid'
        v_advance_months,
        0,
        0,
        v_commission_amount,
        'Auto-generated commission record for policy ' || NEW.policy_number
      );
    EXCEPTION
      WHEN undefined_column THEN
        -- Fallback: Try with older schema that has different columns
        INSERT INTO commissions (
          user_id,
          policy_id,
          carrier_id,
          amount,
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
          'pending',  -- FIXED: Always use 'pending', not 'paid'
          true,
          v_advance_months,
          0,
          0,
          v_commission_amount,
          'Auto-generated commission record for policy ' || NEW.policy_number
        );
    END;

    RAISE NOTICE 'Created commission record (pending): $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_commission_record IS
'Creates commission records when policies are inserted. Always creates with status=pending. Users must manually mark as paid when payment is received.';

-- =====================================================
-- FIX 2: Update commission status change function
-- =====================================================
-- This function was updating commissions to 'paid' when policy becomes active
-- We'll remove this automatic behavior

CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- REMOVED: Automatic marking as 'paid' when policy becomes active
  -- Users must manually mark commissions as paid when they receive payment

  -- When policy is cancelled or lapsed, we still need to handle chargebacks
  IF NEW.status IN ('cancelled', 'lapsed') AND OLD.status = 'active' THEN
    -- Calculate chargeback if needed
    -- This part remains unchanged as it's correct behavior
    UPDATE commissions
    SET
      status = CASE
        WHEN unearned_amount > 0 THEN 'charged_back'
        ELSE status
      END,
      chargeback_date = CASE
        WHEN unearned_amount > 0 THEN CURRENT_DATE
        ELSE chargeback_date
      END,
      chargeback_reason = CASE
        WHEN unearned_amount > 0 THEN 'Policy ' || NEW.status
        ELSE chargeback_reason
      END,
      updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status IN ('pending', 'earned', 'paid')
      AND unearned_amount > 0;

    RAISE NOTICE 'Policy % was %, checking for chargebacks', NEW.policy_number, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_commission_on_policy_status IS
'Handles commission updates when policy status changes. No longer auto-marks as paid. Only handles chargebacks for cancelled/lapsed policies.';

-- =====================================================
-- Add helper function to mark commissions as paid
-- =====================================================
-- This gives users control over when to mark commissions as paid

CREATE OR REPLACE FUNCTION mark_commission_paid(
  p_commission_id UUID,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_commission RECORD;
  v_policy RECORD;
BEGIN
  -- Get commission record
  SELECT * INTO v_commission
  FROM commissions
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Commission not found'
    );
  END IF;

  -- Check if already paid
  IF v_commission.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Commission is already marked as paid'
    );
  END IF;

  -- Get associated policy
  SELECT * INTO v_policy
  FROM policies
  WHERE id = v_commission.policy_id;

  -- Check if policy is active
  IF v_policy.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot mark commission as paid - policy is not active',
      'policy_status', v_policy.status
    );
  END IF;

  -- Update commission to paid
  UPDATE commissions
  SET
    status = 'paid',
    payment_date = p_payment_date,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_commission_id;

  RETURN jsonb_build_object(
    'success', true,
    'commission_id', p_commission_id,
    'payment_date', p_payment_date,
    'message', 'Commission marked as paid successfully'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_commission_paid IS
'Manually mark a commission as paid when payment is actually received. Validates policy is active.';

-- =====================================================
-- Recreate triggers
-- =====================================================

-- Ensure trigger exists for auto-creating commissions
DROP TRIGGER IF EXISTS trigger_auto_create_commission ON policies;
CREATE TRIGGER trigger_auto_create_commission
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();

-- Ensure trigger exists for policy status changes
DROP TRIGGER IF EXISTS trigger_update_commission_status ON policies;
CREATE TRIGGER trigger_update_commission_status
  AFTER UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION update_commission_on_policy_status();

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_test_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Commission Auto-Paid Fix Applied!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Made:';
  RAISE NOTICE '  ✓ auto_create_commission_record() now creates with status=pending';
  RAISE NOTICE '  ✓ Removed automatic marking as paid when policy becomes active';
  RAISE NOTICE '  ✓ Added mark_commission_paid() function for manual payment tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'New Behavior:';
  RAISE NOTICE '  - All new commissions start as pending';
  RAISE NOTICE '  - Users must manually mark as paid when payment received';
  RAISE NOTICE '  - Chargebacks still handled automatically for cancelled/lapsed policies';
  RAISE NOTICE '';
  RAISE NOTICE 'To mark a commission as paid, use:';
  RAISE NOTICE '  SELECT mark_commission_paid(commission_id, payment_date, notes);';
  RAISE NOTICE '===========================================';
END $$;