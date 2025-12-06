-- /home/nneessen/projects/commissionTracker/scripts/check_user_permissions.sql
-- Check actual permissions for nick.neessen@gmail.com

-- 1. Check user profile
SELECT
  id,
  user_id,
  email,
  roles,
  agent_status,
  approval_status,
  is_admin,
  contract_level
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- 2. Check if active_agent role exists
SELECT * FROM roles WHERE name = 'active_agent';

-- 3. Check how many permissions active_agent has
SELECT COUNT(*) as permission_count
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'active_agent';

-- 4. Check actual permissions for active_agent role
SELECT p.code, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'active_agent'
ORDER BY p.code;

-- 5. Test the RPC function that the app uses
SELECT * FROM get_user_permissions(
  (SELECT user_id FROM user_profiles WHERE email = 'nick.neessen@gmail.com')
);

-- 6. Check if permissions table has the navigation permissions
SELECT * FROM permissions WHERE code LIKE 'nav.%' ORDER BY code;

-- 7. Direct check - what should work
SELECT DISTINCT p.code
FROM user_profiles up
CROSS JOIN LATERAL unnest(up.roles) AS role_name
JOIN roles r ON r.name = role_name
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE up.email = 'nick.neessen@gmail.com';