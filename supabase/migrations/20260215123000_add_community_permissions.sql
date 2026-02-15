-- Migration: Add community/forum permissions and role mappings
-- Purpose: Route and action permissions for /community feature

-- ============================================================================
-- 1) Create permissions (idempotent)
-- ============================================================================

INSERT INTO permissions (code, resource, action, scope, description)
VALUES
  ('nav.community', 'navigation', 'access', 'own', 'Access to Community / Forum page'),
  ('community.create.own', 'community', 'create', 'own', 'Create community topics and replies in own IMO'),
  ('community.moderate.own', 'community', 'manage', 'own', 'Moderate community topics and reports in own IMO'),
  ('community.faq.manage', 'community', 'manage', 'own', 'Create and manage FAQ articles in own IMO')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2) Assign permissions to roles
-- ============================================================================

DO $$
DECLARE
  v_permission_id uuid;
  v_role_id uuid;
  v_role_name text;
  v_role_names text[];
BEGIN
  -- nav.community
  SELECT id INTO v_permission_id FROM permissions WHERE code = 'nav.community';
  v_role_names := ARRAY[
    'super_admin',
    'admin',
    'agent',
    'upline_manager',
    'trainer',
    'recruiter',
    'contracting_manager',
    'office_staff',
    'recruit'
  ];

  FOREACH v_role_name IN ARRAY v_role_names LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- community.create.own
  SELECT id INTO v_permission_id FROM permissions WHERE code = 'community.create.own';
  v_role_names := ARRAY[
    'super_admin',
    'admin',
    'agent',
    'upline_manager',
    'trainer',
    'recruiter',
    'contracting_manager',
    'office_staff',
    'recruit'
  ];

  FOREACH v_role_name IN ARRAY v_role_names LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- community.moderate.own (admin + super_admin only for phase 1)
  SELECT id INTO v_permission_id FROM permissions WHERE code = 'community.moderate.own';
  v_role_names := ARRAY['super_admin', 'admin'];

  FOREACH v_role_name IN ARRAY v_role_names LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- community.faq.manage (admin + super_admin only for phase 1)
  SELECT id INTO v_permission_id FROM permissions WHERE code = 'community.faq.manage';
  v_role_names := ARRAY['super_admin', 'admin'];

  FOREACH v_role_name IN ARRAY v_role_names LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

