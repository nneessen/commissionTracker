-- Test script for admin_deleteuser function
-- DO NOT RUN THIS ON PRODUCTION DATA

-- Step 1: Check if function exists
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'admin_deleteuser';

-- Step 2: Check current user permissions
SELECT
  id,
  email,
  is_admin,
  first_name,
  last_name
FROM user_profiles
WHERE id = auth.uid();

-- Step 3: List test users (users with no data - safe to delete for testing)
-- ADJUST THIS QUERY to find a suitable test user
SELECT
  up.id,
  up.email,
  up.first_name,
  up.last_name,
  up.is_admin,
  COUNT(DISTINCT p.id) as policy_count,
  COUNT(DISTINCT c.id) as commission_count,
  COUNT(DISTINCT e.id) as expense_count
FROM user_profiles up
LEFT JOIN policies p ON p.user_id = up.id
LEFT JOIN commissions c ON c.user_id = up.id
LEFT JOIN expenses e ON e.user_id = up.id
WHERE up.is_deleted = false
GROUP BY up.id, up.email, up.first_name, up.last_name, up.is_admin
ORDER BY policy_count ASC, commission_count ASC
LIMIT 10;

-- Step 4: Test deletion (REPLACE 'test-user-uuid' with actual test user ID)
-- SELECT admin_deleteuser('test-user-uuid');

-- Expected successful response:
-- {
--   "success": true,
--   "user_id": "uuid",
--   "deleted_from_tables": {
--     "commissions": 0,
--     "policies": 0,
--     ...
--   },
--   "message": "User and all related data successfully deleted"
-- }
