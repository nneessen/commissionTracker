-- /home/nneessen/projects/commissionTracker/scripts/fix_nick_user.sql
-- Script to fix nick.neessen@gmail.com user to be an active agent with full access

-- Check current state
SELECT
  id,
  email,
  roles,
  agent_status,
  approval_status,
  contract_level,
  is_admin
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- Fix the user
UPDATE user_profiles
SET
  roles = ARRAY['active_agent']::text[],
  agent_status = 'licensed',
  approval_status = 'approved',
  contract_level = 100
WHERE email = 'nick.neessen@gmail.com';

-- Verify the update
SELECT
  id,
  email,
  roles,
  agent_status,
  approval_status,
  contract_level,
  is_admin
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- Check what permissions the active_agent role has
SELECT
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'active_agent'
GROUP BY r.name;

-- Check if active_agent role exists
SELECT * FROM roles WHERE name = 'active_agent';