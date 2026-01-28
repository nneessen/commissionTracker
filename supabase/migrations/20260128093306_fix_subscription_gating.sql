-- supabase/migrations/20260128093306_fix_subscription_gating.sql
-- Fix subscription tier feature gating issues:
-- 1. Add nav.recruiting_pipeline permission to agent role so recruiting nav shows when recruiting_basic is enabled
-- 2. Disable temporary access so plan matrix is respected

-- Step 1: Add nav.recruiting_pipeline permission to agent role
-- This allows agents to see the Recruiting nav item when their subscription plan includes recruiting_basic
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'agent';

  -- Add nav.recruiting_pipeline if missing
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id
  FROM permissions p
  WHERE p.code = 'nav.recruiting_pipeline'
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_role_id AND rp.permission_id = p.id
    );

  RAISE NOTICE 'Agent role now has nav.recruiting_pipeline permission';
END $$;

-- Step 2: Disable temporary access
-- This ensures the plan matrix (Feature & Analytics Configuration) is respected
-- Users will only have access to features their subscription plan explicitly enables
UPDATE subscription_settings
SET
  temporary_access_enabled = false,
  updated_at = NOW()
WHERE temporary_access_enabled = true;

COMMENT ON TABLE subscription_settings IS
'Singleton table for global subscription settings.
temporary_access_enabled disabled as of 2026-01-28 to enforce plan matrix gating.';
