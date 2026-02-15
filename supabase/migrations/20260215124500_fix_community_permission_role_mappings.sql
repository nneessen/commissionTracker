-- Migration: Fix community permission role mappings for system roles
-- Purpose: Insert role_permissions for new community permissions while preserving
--          system-role protection by temporarily toggling is_system_role.

DO $$
DECLARE
  v_nav_community_id uuid;
  v_create_own_id uuid;
  v_moderate_own_id uuid;
  v_faq_manage_id uuid;
BEGIN
  SELECT id INTO v_nav_community_id FROM permissions WHERE code = 'nav.community';
  SELECT id INTO v_create_own_id FROM permissions WHERE code = 'community.create.own';
  SELECT id INTO v_moderate_own_id FROM permissions WHERE code = 'community.moderate.own';
  SELECT id INTO v_faq_manage_id FROM permissions WHERE code = 'community.faq.manage';

  IF v_nav_community_id IS NULL
     OR v_create_own_id IS NULL
     OR v_moderate_own_id IS NULL
     OR v_faq_manage_id IS NULL THEN
    RAISE EXCEPTION 'Missing required community permissions. Run base permissions migration first.';
  END IF;

  CREATE TEMP TABLE tmp_target_roles ON COMMIT DROP AS
  SELECT id, name, is_system_role
  FROM roles
  WHERE name = ANY(ARRAY[
    'super_admin',
    'admin',
    'agent',
    'upline_manager',
    'trainer',
    'recruiter',
    'contracting_manager',
    'office_staff',
    'recruit'
  ]);

  -- Temporarily allow permission modifications for protected system roles
  UPDATE roles r
  SET is_system_role = false
  FROM tmp_target_roles t
  WHERE r.id = t.id
    AND t.is_system_role = true;

  -- nav.community (broad access)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT t.id, v_nav_community_id
  FROM tmp_target_roles t
  ON CONFLICT DO NOTHING;

  -- community.create.own (broad access)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT t.id, v_create_own_id
  FROM tmp_target_roles t
  ON CONFLICT DO NOTHING;

  -- moderation + faq manage (admin/super_admin only in phase 1)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT t.id, v_moderate_own_id
  FROM tmp_target_roles t
  WHERE t.name = ANY(ARRAY['super_admin', 'admin'])
  ON CONFLICT DO NOTHING;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT t.id, v_faq_manage_id
  FROM tmp_target_roles t
  WHERE t.name = ANY(ARRAY['super_admin', 'admin'])
  ON CONFLICT DO NOTHING;

  -- Restore original protection flags exactly as they were
  UPDATE roles r
  SET is_system_role = t.is_system_role
  FROM tmp_target_roles t
  WHERE r.id = t.id;
END $$;

