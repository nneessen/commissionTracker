-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251222_004_REMOVE_DUPLICATE_TRIGGER_AND_FIX.sql
-- THE ACTUAL PROBLEM: There are TWO triggers on policies table both trying to handle cancellation!
-- 1. trigger_handle_policy_cancellation (OLD, uses commission_amount)
-- 2. trigger_update_commission_status (NEWER, calls our fixed function)
-- They're CONFLICTING! The old one is failing first!

BEGIN;

-- =====================================================
-- DROP THE OLD CONFLICTING TRIGGER AND FUNCTION
-- =====================================================

-- Drop the OLD trigger that's causing the problem
DROP TRIGGER IF EXISTS trigger_handle_policy_cancellation ON policies;

-- Drop the OLD function that uses commission_amount
DROP FUNCTION IF EXISTS handle_policy_cancellation();

-- =====================================================
-- VERIFY WE ONLY HAVE THE CORRECT TRIGGER
-- =====================================================
DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'policies'
  AND trigger_name IN ('trigger_handle_policy_cancellation', 'trigger_update_commission_status');

  RAISE NOTICE 'Policy triggers found: %', v_trigger_count;

  IF v_trigger_count > 1 THEN
    RAISE WARNING 'Multiple triggers still exist on policies table!';
  ELSE
    RAISE NOTICE 'Only one trigger remains - good!';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_test_result TEXT;
BEGIN
  -- List remaining triggers
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'REMOVED DUPLICATE TRIGGER!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Removed:';
  RAISE NOTICE '  ✓ trigger_handle_policy_cancellation (OLD, BAD)';
  RAISE NOTICE '  ✓ handle_policy_cancellation() function (used commission_amount)';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining trigger:';
  RAISE NOTICE '  ✓ trigger_update_commission_status (calls fixed functions)';
  RAISE NOTICE '';
  RAISE NOTICE 'The problem was TWO triggers trying to handle the same event!';
  RAISE NOTICE 'The old one was failing first with the commission_amount error.';
  RAISE NOTICE '';
  RAISE NOTICE 'Commission status "cancelled" will FINALLY work now!';
  RAISE NOTICE '===========================================';

  -- Show remaining triggers
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining triggers on policies table:';
  FOR v_test_result IN
    SELECT trigger_name || ' -> ' || action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'policies'
  LOOP
    RAISE NOTICE '  %', v_test_result;
  END LOOP;
END $$;