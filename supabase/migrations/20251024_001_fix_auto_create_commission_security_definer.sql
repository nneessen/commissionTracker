-- Fix "permission denied for table users" error in policy creation
--
-- ROOT CAUSE:
-- The auto_create_commission_record() trigger function tries to SELECT from auth.users
-- but runs as SECURITY INVOKER (default), using the authenticated user's permissions.
-- Authenticated users don't have SELECT permission on auth.users table.
--
-- SOLUTION:
-- Recreate the function with SECURITY DEFINER so it runs with postgres's permissions.
-- This allows the function to access auth.users table while still being secure.

BEGIN;

-- =====================================================
-- DROP AND RECREATE WITH SECURITY DEFINER
-- =====================================================

DROP FUNCTION IF EXISTS auto_create_commission_record() CASCADE;

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- FIX: Run with function owner's (postgres) permissions
SET search_path = public, pg_temp  -- Security: Prevent search_path attacks
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
  -- NOW THIS WORKS because function runs with postgres permissions!
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
$$;

COMMENT ON FUNCTION auto_create_commission_record IS
'Auto-creates commission when policy is created. FIXED: Uses SECURITY DEFINER to access auth.users table. Uses correct field name "amount".';

-- Recreate the trigger (it was dropped with CASCADE above)
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
  v_function_security TEXT;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Check function security setting
  SELECT prosecdef::TEXT INTO v_function_security
  FROM pg_proc
  WHERE proname = 'auto_create_commission_record';

  -- Check trigger exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE trigger_name = 'trigger_auto_create_commission'
    AND event_object_table = 'policies'
  ) INTO v_trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRATION APPLIED SUCCESSFULLY!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Function Security Setting:';

  IF v_function_security = 'true' THEN
    RAISE NOTICE '  ✓ SECURITY DEFINER enabled (correct!)';
  ELSE
    RAISE WARNING '  ✗ SECURITY INVOKER still set (migration failed!)';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Trigger Status:';

  IF v_trigger_exists THEN
    RAISE NOTICE '  ✓ trigger_auto_create_commission exists on policies table';
  ELSE
    RAISE WARNING '  ✗ Trigger not found!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '  ✓ Function now runs with postgres permissions';
  RAISE NOTICE '  ✓ Can access auth.users table to get contract_comp_level';
  RAISE NOTICE '  ✓ search_path protection added for security';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy creation should now work without "permission denied" errors!';
  RAISE NOTICE '===========================================';
END $$;
