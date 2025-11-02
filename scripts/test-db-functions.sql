-- scripts/test-db-functions.sql
-- Purpose: Verify all required database functions exist and work correctly

-- ============================================================================
-- TEST 1: Check if get_user_commission_profile function exists
-- ============================================================================

SELECT
  'TEST 1: Function Existence' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'get_user_commission_profile'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'get_user_commission_profile function should exist' as description;

-- ============================================================================
-- TEST 2: Check function signature
-- ============================================================================

SELECT
  'TEST 2: Function Signature' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'get_user_commission_profile'
        AND pg_get_function_arguments(oid) = 'p_user_id uuid, p_lookback_months integer DEFAULT 12'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'Function should have correct parameters (p_user_id uuid, p_lookback_months integer)' as description;

-- ============================================================================
-- TEST 3: Check required indexes exist
-- ============================================================================

SELECT
  'TEST 3: Index idx_comp_guide_lookup' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE indexname = 'idx_comp_guide_lookup'
        AND tablename = 'comp_guide'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'Index for comp_guide lookups should exist' as description;

SELECT
  'TEST 4: Index idx_policies_user_product_date' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE indexname = 'idx_policies_user_product_date'
        AND tablename = 'policies'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'Index for policies user/product/date lookups should exist' as description;

-- ============================================================================
-- TEST 5: Check RLS policy exists
-- ============================================================================

SELECT
  'TEST 5: RLS Policy' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE policyname = 'comp_guide_public_read'
        AND tablename = 'comp_guide'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'comp_guide_public_read RLS policy should exist' as description;

-- ============================================================================
-- TEST 6: Check function grants
-- ============================================================================

SELECT
  'TEST 6: Function Grants' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_name = 'get_user_commission_profile'
        AND grantee = 'authenticated'
        AND privilege_type = 'EXECUTE'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'authenticated role should have EXECUTE permission' as description;

-- ============================================================================
-- TEST 7: Check function can be called (with sample user)
-- ============================================================================

-- Note: Replace USER_ID with an actual user ID from your database
-- SELECT
--   'TEST 7: Function Execution' as test_name,
--   CASE
--     WHEN (SELECT COUNT(*) FROM get_user_commission_profile('YOUR_USER_ID'::uuid, 12)) > 0
--     THEN '✅ PASS'
--     ELSE '❌ FAIL'
--   END as result,
--   'Function should execute and return data' as description;

-- ============================================================================
-- TEST 8: Check calculate_earned_amount function exists
-- ============================================================================

SELECT
  'TEST 8: calculate_earned_amount exists' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'calculate_earned_amount'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'calculate_earned_amount function should exist' as description;

-- ============================================================================
-- TEST 9: Check update_commission_earned_amounts function exists
-- ============================================================================

SELECT
  'TEST 9: update_commission_earned_amounts exists' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'update_commission_earned_amounts'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result,
  'update_commission_earned_amounts function should exist' as description;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT
  '═════════════════════════════════════════════' as separator,
  '' as test_name,
  '' as result,
  '' as description;

SELECT
  'SUMMARY' as test_name,
  COUNT(*) FILTER (WHERE result = '✅ PASS') || ' PASSED' as result,
  COUNT(*) FILTER (WHERE result = '❌ FAIL') || ' FAILED' as description
FROM (
  -- Re-run all tests for summary
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_commission_profile') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END as result
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'get_user_commission_profile'
        AND pg_get_function_arguments(oid) = 'p_user_id uuid, p_lookback_months integer DEFAULT 12'
      ) THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_comp_guide_lookup') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_policies_user_product_date') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comp_guide_public_read') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.routine_privileges
        WHERE routine_name = 'get_user_commission_profile'
        AND grantee = 'authenticated'
      ) THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_earned_amount') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
  UNION ALL
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_commission_earned_amounts') THEN '✅ PASS'
      ELSE '❌ FAIL'
    END
) tests;
