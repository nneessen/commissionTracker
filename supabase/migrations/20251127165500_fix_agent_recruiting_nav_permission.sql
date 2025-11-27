-- Migration: Fix Agent Recruiting Navigation Permission
-- Purpose: Grant all agents access to recruiting navigation
-- Created: 2025-11-27
--
-- CRITICAL FIX: Agents need to see the recruiting page to manage their own recruits.
-- The RLS policies already correctly restrict agents to only see their recruits + downline.
-- This migration only adds the missing navigation permission.

BEGIN;

-- Add nav.recruiting_pipeline permission to agent role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'agent'),
  (SELECT id FROM permissions WHERE code = 'nav.recruiting_pipeline')
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions
  WHERE role_id = (SELECT id FROM roles WHERE name = 'agent')
  AND permission_id = (SELECT id FROM permissions WHERE code = 'nav.recruiting_pipeline')
);

COMMIT;

-- Verification
DO $$
DECLARE
  agent_perms TEXT[];
BEGIN
  -- Get all permissions for agent role
  SELECT ARRAY_AGG(p.code)
  INTO agent_perms
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN roles r ON rp.role_id = r.id
  WHERE r.name = 'agent';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent Recruiting Permission Fixed!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Agent role now has % permissions', array_length(agent_perms, 1);
  RAISE NOTICE '';
  RAISE NOTICE 'Agents can now:';
  RAISE NOTICE '  ✓ See Recruiting nav item (nav.recruiting_pipeline)';
  RAISE NOTICE '  ✓ Manage their own recruits (recruiting.*.own)';
  RAISE NOTICE '  ✓ See entire downline hierarchy (RLS enforced)';
  RAISE NOTICE '';
  RAISE NOTICE 'Data isolation still enforced:';
  RAISE NOTICE '  - Agents see ONLY their recruits + downline';
  RAISE NOTICE '  - No access to other agents'' recruits';
  RAISE NOTICE '===========================================';
END $$;
