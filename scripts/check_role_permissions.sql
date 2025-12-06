-- /home/nneessen/projects/commissionTracker/scripts/check_role_permissions.sql
-- Script to check what permissions each role has

-- 1. Check all roles in the system
SELECT
  id,
  name,
  display_name,
  description
FROM roles
ORDER BY name;

-- 2. Check permissions for active_agent role specifically
SELECT
  r.name as role_name,
  p.code as permission_code,
  p.resource,
  p.action,
  p.scope,
  p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'active_agent'
ORDER BY p.code;

-- 3. Count permissions per role
SELECT
  r.name as role_name,
  r.display_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.display_name
ORDER BY permission_count DESC;

-- 4. Check navigation permissions specifically (what's needed for the sidebar)
SELECT
  r.name as role_name,
  p.code as permission_code
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.code LIKE 'nav.%'
ORDER BY r.name, p.code;

-- 5. Check what permissions nick.neessen@gmail.com would have
SELECT DISTINCT
  p.code as permission_code,
  p.resource,
  p.action,
  p.description
FROM user_profiles up
CROSS JOIN LATERAL unnest(up.roles) as user_role(role_name)
JOIN roles r ON r.name = user_role.role_name
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE up.email = 'nick.neessen@gmail.com'
ORDER BY p.code;

-- 6. Check if active_agent role exists and its ID
SELECT * FROM roles WHERE name = 'active_agent';

-- 7. List ALL available permissions in the system (for reference)
SELECT
  code,
  resource,
  action,
  scope,
  description
FROM permissions
WHERE code LIKE 'nav.%' OR code LIKE 'policies.%' OR code LIKE 'expenses.%'
ORDER BY code;