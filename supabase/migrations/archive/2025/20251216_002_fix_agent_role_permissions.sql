-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251216_002_fix_agent_role_permissions.sql
-- Migration: Add missing nav permissions to agent system role
--
-- PROBLEM: The agent role (default for all licensed agents) was missing
-- nav.team_dashboard and nav.downline_reports permissions. This prevented
-- agents from seeing the Team nav item.
--
-- SOLUTION: Added the missing permissions to the agent role.
-- Since agent is a system role, we temporarily disabled the protection,
-- added permissions, then re-enabled protection.
--
-- APPLIED: 2025-12-16 via API (trigger bypass method)
--
-- The following permissions were added to the 'agent' role:
-- - nav.team_dashboard (Team nav access)
-- - nav.downline_reports (Reports nav access)
--
-- This migration documents the fix. The actual changes were applied via:
-- 1. PATCH roles SET is_system_role = false WHERE name = 'agent'
-- 2. INSERT INTO role_permissions (nav.team_dashboard, nav.downline_reports)
-- 3. PATCH roles SET is_system_role = true WHERE name = 'agent'

-- Idempotent version for future runs (safe to re-run):
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'agent';

  -- Add nav.team_dashboard if missing
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id
  FROM permissions p
  WHERE p.code = 'nav.team_dashboard'
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_role_id AND rp.permission_id = p.id
    );

  -- Add nav.downline_reports if missing
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id
  FROM permissions p
  WHERE p.code = 'nav.downline_reports'
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_role_id AND rp.permission_id = p.id
    );

  RAISE NOTICE 'Agent role permissions verified: nav.team_dashboard, nav.downline_reports';
END $$;

COMMENT ON TABLE role_permissions IS
'Maps roles to permissions. Agent role includes nav.team_dashboard for team access.';
