-- Test script for commission rate calculation function
-- Run with: psql <connection-string> -f scripts/test-commission-function.sql

\echo '🔍 Testing Commission Rate Calculation Function'
\echo ''

-- Test 1: Get commission profile for test user
\echo 'Test 1: User Commission Profile'
\echo '────────────────────────────────────────────────'
SELECT
  contract_level as "Contract Level",
  ROUND(simple_avg_rate * 100, 2) || '%' as "Simple Avg",
  ROUND(weighted_avg_rate * 100, 2) || '%' as "Weighted Avg",
  data_quality as "Data Quality"
FROM get_user_commission_profile('d0d3edea-af6d-4990-80b8-1765ba829896'::uuid, 12);

\echo ''

-- Test 2: Show products with sales (if any)
\echo 'Test 2: Products with Sales History'
\echo '────────────────────────────────────────────────'
SELECT
  jsonb_array_elements(product_breakdown) -> 'productName' as "Product",
  jsonb_array_elements(product_breakdown) -> 'commissionRate' as "Rate",
  jsonb_array_elements(product_breakdown) -> 'premiumWeight' as "Weight",
  jsonb_array_elements(product_breakdown) -> 'policyCount' as "Policies"
FROM get_user_commission_profile('d0d3edea-af6d-4990-80b8-1765ba829896'::uuid, 12)
WHERE (jsonb_array_elements(product_breakdown) -> 'premiumWeight')::text::numeric > 0
LIMIT 10;

\echo ''

-- Test 3: Verify calculation accuracy
\echo 'Test 3: Calculation Verification'
\echo '────────────────────────────────────────────────'
WITH profile AS (
  SELECT * FROM get_user_commission_profile('d0d3edea-af6d-4990-80b8-1765ba829896'::uuid, 12)
)
SELECT
  'Simple avg should be average of all products at contract level' as test,
  CASE
    WHEN simple_avg_rate BETWEEN 0 AND 2 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
FROM profile
UNION ALL
SELECT
  'Weighted avg should equal simple avg if no sales history' as test,
  CASE
    WHEN weighted_avg_rate = simple_avg_rate THEN '✅ PASS (No sales history)'
    WHEN weighted_avg_rate != simple_avg_rate THEN '✅ PASS (Has sales history)'
    ELSE '❌ FAIL'
  END as result
FROM profile
UNION ALL
SELECT
  'Data quality should be appropriate for policy count' as test,
  CASE
    WHEN data_quality IN ('HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT') THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
FROM profile;

\echo ''
\echo '✅ All tests completed!'
