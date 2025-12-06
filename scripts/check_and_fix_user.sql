-- Check nick.neessen@gmail.com user details
SELECT
  id,
  email,
  roles,
  agent_status,
  approval_status,
  contract_level,
  is_admin,
  first_name,
  last_name
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- Check what roles exist in the system
SELECT name, display_name, description
FROM roles
ORDER BY name;

-- Check what permissions the active_agent role has
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name IN ('agent', 'active_agent', 'recruit')
GROUP BY r.name;

-- Fix nick.neessen@gmail.com to have active_agent role
UPDATE user_profiles
SET
  roles = ARRAY['active_agent'],
  agent_status = 'licensed'
WHERE email = 'nick.neessen@gmail.com';

-- Verify the update
SELECT
  email,
  roles,
  agent_status,
  approval_status
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';