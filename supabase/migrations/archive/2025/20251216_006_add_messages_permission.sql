-- Migration: 20251216_006_add_messages_permission.sql
-- Purpose: Add nav.messages permission for Communications Hub
-- This permission grants access to the /messages route

-- ============================================================================
-- ADD PERMISSION: nav.messages
-- ============================================================================

DO $$
DECLARE
  v_permission_id uuid;
BEGIN
  -- Insert the nav.messages permission if it doesn't exist
  INSERT INTO permissions (code, resource, action, scope, description)
  VALUES (
    'nav.messages',
    'navigation',
    'access',
    'own',
    'Access to the Communications Hub / Messages feature'
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO v_permission_id;

  -- If we didn't get an ID from insert, fetch it
  IF v_permission_id IS NULL THEN
    SELECT id INTO v_permission_id FROM permissions WHERE code = 'nav.messages';
  END IF;

  RAISE NOTICE 'nav.messages permission ID: %', v_permission_id;
END $$;

-- ============================================================================
-- ASSIGN nav.messages TO ROLES
-- Grant to: admin, active_agent, agent, upline_manager, trainer, recruiter, contracting_manager, office_staff
-- NOT granted to: recruit, view_only
-- ============================================================================

DO $$
DECLARE
  v_permission_id uuid;
  v_role_id uuid;
  v_role_names text[] := ARRAY['admin', 'active_agent', 'agent', 'upline_manager', 'trainer', 'recruiter', 'contracting_manager', 'office_staff'];
  v_role_name text;
BEGIN
  -- Get the nav.messages permission ID
  SELECT id INTO v_permission_id FROM permissions WHERE code = 'nav.messages';

  IF v_permission_id IS NULL THEN
    RAISE EXCEPTION 'nav.messages permission not found';
  END IF;

  -- Assign to each role
  FOREACH v_role_name IN ARRAY v_role_names LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;

    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT DO NOTHING;

      RAISE NOTICE 'Assigned nav.messages to role: %', v_role_name;
    ELSE
      RAISE NOTICE 'Role not found: %', v_role_name;
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE permissions IS
'System permissions. nav.messages added 2025-12-16 for Communications Hub access.';
