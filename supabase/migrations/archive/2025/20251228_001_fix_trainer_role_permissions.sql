-- Fix trainer and contracting_manager role permissions
-- These roles should have LIMITED access, not full admin access

-- Step 1: Temporarily mark roles as non-system to allow modification
UPDATE roles SET is_system_role = false WHERE name IN ('trainer', 'contracting_manager');

-- Step 2: Delete ALL existing permissions for trainer role
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name = 'trainer');

-- Step 3: Delete ALL existing permissions for contracting_manager role
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name = 'contracting_manager');

-- Step 4: Add ONLY the permissions trainers should have
-- nav.training_hub - Access to training hub
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer' AND p.code = 'nav.training_hub';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'contracting_manager' AND p.code = 'nav.training_hub';

-- nav.messages - Access to messages
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer' AND p.code = 'nav.messages';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'contracting_manager' AND p.code = 'nav.messages';

-- recruiting.read.all - Can view recruits (for training dashboard stats)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer' AND p.code = 'recruiting.read.all';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'contracting_manager' AND p.code = 'recruiting.read.all';

-- Step 5: Mark roles back as system roles
UPDATE roles SET is_system_role = true WHERE name IN ('trainer', 'contracting_manager');

-- Verify the changes
SELECT r.name as role_name, p.code as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('trainer', 'contracting_manager')
ORDER BY r.name, p.code;
