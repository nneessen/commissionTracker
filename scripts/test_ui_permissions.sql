-- /home/nneessen/projects/commissionTracker/scripts/test_ui_permissions.sql
-- Test that the UI permissions are now working for nick.neessen@gmail.com

-- Get the user_id for testing
WITH test_user AS (
  SELECT user_id, email, roles
  FROM user_profiles
  WHERE email = 'nick.neessen@gmail.com'
)
-- Test the actual RPC function that the UI calls
SELECT
  'Testing permissions for: ' || tu.email as test_user,
  tu.roles as user_roles,
  COUNT(gup.permission_code) as total_permissions,
  COUNT(CASE WHEN gup.permission_code LIKE 'nav.%' THEN 1 END) as nav_permissions,
  ARRAY_AGG(gup.permission_code ORDER BY gup.permission_code) FILTER (WHERE gup.permission_code LIKE 'nav.%') as nav_codes
FROM test_user tu
LEFT JOIN LATERAL get_user_permissions(tu.user_id) gup ON true
GROUP BY tu.email, tu.roles;

-- Check specific permissions the Sidebar needs
SELECT
  'Sidebar Permission Check:' as check_type,
  permission_needed,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM get_user_permissions(
        (SELECT user_id FROM user_profiles WHERE email = 'nick.neessen@gmail.com')
      ) WHERE permission_code = permission_needed
    ) THEN '✓ Has permission'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES
  ('nav.dashboard'),
  ('nav.downline_reports'),
  ('expenses.read.own'),
  ('nav.policies'),
  ('nav.team_dashboard'),
  ('nav.recruiting_pipeline')
) AS required(permission_needed)
ORDER BY permission_needed;