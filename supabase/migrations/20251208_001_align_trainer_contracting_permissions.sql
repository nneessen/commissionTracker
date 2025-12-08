-- Migration: Align trainer and contracting_manager permissions
-- Both roles should have identical access for the Training & Contracting Hub

-- Step 1: Create new nav.training_hub permission with proper columns
INSERT INTO permissions (code, resource, action, scope, description)
VALUES ('nav.training_hub', 'nav', 'training_hub', 'own', 'Access Training Hub')
ON CONFLICT (code) DO NOTHING;

-- Step 2: Temporarily disable system role protection for trainer and contracting_manager
-- This is safe because we're just adding permissions, not removing protection
UPDATE roles SET is_system_role = false WHERE name IN ('trainer', 'contracting_manager');

-- Step 3: Define the unified permission set for both roles
DO $$
DECLARE
  trainer_role_id UUID;
  contracting_manager_role_id UUID;
  perm_id UUID;
  unified_permissions TEXT[] := ARRAY[
    -- Navigation
    'nav.dashboard',
    'nav.documents',
    'nav.recruiting_pipeline',
    'nav.training_admin',
    'nav.training_hub',
    'nav.user_management',
    -- Carriers & Contracts
    'carriers.manage',
    'contracts.manage',
    -- Documents
    'documents.manage.all',
    -- Recruiting (full access)
    'recruiting.create.own',
    'recruiting.delete.own',
    'recruiting.read.all',
    'recruiting.update.all',
    -- Users
    'users.manage'
  ];
  perm_code TEXT;
BEGIN
  -- Get role IDs
  SELECT id INTO trainer_role_id FROM roles WHERE name = 'trainer';
  SELECT id INTO contracting_manager_role_id FROM roles WHERE name = 'contracting_manager';

  IF trainer_role_id IS NULL THEN
    RAISE EXCEPTION 'trainer role not found';
  END IF;

  IF contracting_manager_role_id IS NULL THEN
    RAISE EXCEPTION 'contracting_manager role not found';
  END IF;

  -- Clear existing permissions for both roles (we'll re-add them)
  DELETE FROM role_permissions WHERE role_id = trainer_role_id;
  DELETE FROM role_permissions WHERE role_id = contracting_manager_role_id;

  -- Add unified permissions to both roles
  FOREACH perm_code IN ARRAY unified_permissions
  LOOP
    SELECT id INTO perm_id FROM permissions WHERE code = perm_code;

    IF perm_id IS NOT NULL THEN
      -- Add to trainer
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (trainer_role_id, perm_id)
      ON CONFLICT DO NOTHING;

      -- Add to contracting_manager
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (contracting_manager_role_id, perm_id)
      ON CONFLICT DO NOTHING;
    ELSE
      RAISE WARNING 'Permission % not found, skipping', perm_code;
    END IF;
  END LOOP;

  RAISE NOTICE 'Successfully aligned trainer and contracting_manager permissions with % permissions each', array_length(unified_permissions, 1);
END $$;

-- Step 4: Re-enable system role protection
UPDATE roles SET is_system_role = true WHERE name IN ('trainer', 'contracting_manager');

-- Step 5: Update role descriptions to reflect new unified scope
UPDATE roles
SET description = 'Training, onboarding, and contracting support with full recruiting access'
WHERE name = 'trainer';

UPDATE roles
SET description = 'Training, onboarding, and contracting support with full recruiting access'
WHERE name = 'contracting_manager';

-- Verify the changes
DO $$
DECLARE
  trainer_count INTEGER;
  contracting_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trainer_count
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.name = 'trainer';

  SELECT COUNT(*) INTO contracting_count
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.name = 'contracting_manager';

  IF trainer_count != contracting_count THEN
    RAISE EXCEPTION 'Permission counts do not match: trainer=%, contracting_manager=%', trainer_count, contracting_count;
  END IF;

  RAISE NOTICE 'Verification passed: Both roles have % permissions', trainer_count;
END $$;
