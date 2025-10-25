-- Fix schema mismatch in auto_create_commission_record function
--
-- PROBLEM:
-- The function tries to INSERT into columns that don't exist:
-- - carrier_id (doesn't exist in commissions table)
-- - is_advance (doesn't exist, should use 'type' column instead)
--
-- SOLUTION:
-- Update the function to only use columns that actually exist in the commissions table

BEGIN;

-- =====================================================
-- FIX THE INSERT STATEMENT
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Keep SECURITY DEFINER from previous fix
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
    -- FIXED: Only insert into columns that actually exist
    INSERT INTO commissions (
      user_id,
      policy_id,
      amount,
      type,              -- FIXED: Use 'type' instead of 'is_advance'
      status,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      notes
      -- REMOVED: carrier_id (doesn't exist in schema)
      -- REMOVED: is_advance (doesn't exist, using 'type' instead)
    ) VALUES (
      NEW.user_id,
      NEW.id,
      v_commission_amount,
      'advance',         -- FIXED: Set type to 'advance' instead of is_advance = true
      CASE
        WHEN NEW.status = 'active' THEN 'paid'
        ELSE 'pending'
      END,
      v_advance_months,
      0,                 -- No months paid yet
      0,                 -- No months earned yet
      v_commission_amount, -- All unearned initially
      'Auto-generated commission record for policy ' || NEW.policy_number
    );

    RAISE NOTICE 'Created commission record: $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_commission_record IS
'Auto-creates commission when policy is created. Uses SECURITY DEFINER to access auth.users table. FIXED: Uses correct schema columns (type instead of is_advance, removed carrier_id).';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_function_source TEXT;
BEGIN
  -- Get function source to verify it doesn't reference non-existent columns
  SELECT prosrc INTO v_function_source
  FROM pg_proc
  WHERE proname = 'auto_create_commission_record'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'SCHEMA MISMATCH FIX APPLIED!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';

  IF v_function_source LIKE '%carrier_id%' THEN
    RAISE WARNING '  ✗ Function still references carrier_id!';
  ELSE
    RAISE NOTICE '  ✓ Removed carrier_id reference';
  END IF;

  IF v_function_source LIKE '%is_advance%' THEN
    RAISE WARNING '  ✗ Function still references is_advance!';
  ELSE
    RAISE NOTICE '  ✓ Removed is_advance reference';
  END IF;

  IF v_function_source LIKE '%type%' THEN
    RAISE NOTICE '  ✓ Using type column instead';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Commissions table actual columns:';
  RAISE NOTICE '  - user_id, policy_id, amount, rate';
  RAISE NOTICE '  - type (not is_advance)';
  RAISE NOTICE '  - status, payment_date, notes';
  RAISE NOTICE '  - advance_months, months_paid';
  RAISE NOTICE '  - earned_amount, unearned_amount';
  RAISE NOTICE '  - chargeback_amount, chargeback_date, chargeback_reason';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy creation should now work!';
  RAISE NOTICE '===========================================';
END $$;
