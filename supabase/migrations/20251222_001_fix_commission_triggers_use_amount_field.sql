-- supabase/migrations/20251222_001_fix_commission_triggers_use_amount_field.sql
-- Fix all triggers and functions to use 'amount' instead of 'commission_amount'

BEGIN;

-- =====================================================
-- Fix auto_create_commission_record function
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
'Auto-creates commission record when policy is created. FIXED: Uses correct field name "amount"';

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed Commission Trigger Functions';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Updated: auto_create_commission_record()';
  RAISE NOTICE 'Fixed: commission_amount -> amount';
  RAISE NOTICE '';
  RAISE NOTICE 'Commission status changes should now work!';
  RAISE NOTICE '===========================================';
END $$;
