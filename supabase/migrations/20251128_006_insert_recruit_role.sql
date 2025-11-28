-- Insert recruit role into roles table
-- Recruit role for new recruits in onboarding pipeline with limited access

BEGIN;

-- Insert the recruit role
INSERT INTO public.roles (name, display_name, description, is_system_role, respects_hierarchy, parent_role_id)
VALUES (
  'recruit',
  'Recruit',
  'New recruit in onboarding pipeline with limited access to their own profile and progress',
  true,
  false, -- Recruits don't need hierarchy checks yet
  NULL
)
ON CONFLICT (name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_system_role = EXCLUDED.is_system_role;

-- Get the recruit role ID for permissions
DO $$
DECLARE
  v_recruit_role_id uuid;
  v_permission_id uuid;
BEGIN
  -- Get recruit role ID
  SELECT id INTO v_recruit_role_id
  FROM public.roles
  WHERE name = 'recruit';

  -- Create recruit-specific permissions if they don't exist
  -- Permission: View own recruiting pipeline
  INSERT INTO public.permissions (code, resource, action, scope, description, is_system_permission)
  VALUES (
    'recruiting.read.self',
    'recruiting',
    'read',
    'self',
    'Can view their own recruiting progress and checklist',
    true
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO v_permission_id;

  -- Link permission to recruit role
  IF v_permission_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Permission already existed, find it and link it
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE code = 'recruiting.read.self';

    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Permission: Edit own profile
  INSERT INTO public.permissions (code, resource, action, scope, description, is_system_permission)
  VALUES (
    'users.update.self',
    'users',
    'update',
    'self',
    'Can edit their own profile information',
    true
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO v_permission_id;

  IF v_permission_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE code = 'users.update.self';

    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Permission: Upload documents
  INSERT INTO public.permissions (code, resource, action, scope, description, is_system_permission)
  VALUES (
    'documents.create.own',
    'documents',
    'create',
    'own',
    'Can upload required onboarding documents',
    true
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO v_permission_id;

  IF v_permission_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  ELSE
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE code = 'documents.create.own';

    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_recruit_role_id, v_permission_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
