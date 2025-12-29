-- supabase/migrations/20251229_002_add_recruiting_permission_to_staff.sql
-- Add nav.recruiting_pipeline and nav.contracting_hub permissions to trainers and contracting managers
-- This allows them to access /recruiting and /contracting pages

-- First, create the nav.contracting_hub permission if it doesn't exist
INSERT INTO permissions (code, resource, action, scope, description)
SELECT 'nav.contracting_hub', 'nav', 'view', 'imo', 'Access contracting hub to manage carrier contracts'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'nav.contracting_hub');

-- Add nav.recruiting_pipeline to trainer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer' AND p.code = 'nav.recruiting_pipeline'
ON CONFLICT DO NOTHING;

-- Add nav.recruiting_pipeline to contracting_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'contracting_manager' AND p.code = 'nav.recruiting_pipeline'
ON CONFLICT DO NOTHING;

-- Add nav.contracting_hub to trainer role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'trainer' AND p.code = 'nav.contracting_hub'
ON CONFLICT DO NOTHING;

-- Add nav.contracting_hub to contracting_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'contracting_manager' AND p.code = 'nav.contracting_hub'
ON CONFLICT DO NOTHING;

-- Verify the changes
SELECT r.name as role_name, p.code as permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name IN ('trainer', 'contracting_manager')
ORDER BY r.name, p.code;
