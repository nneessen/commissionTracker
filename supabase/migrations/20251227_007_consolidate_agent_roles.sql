-- Migration: Consolidate active_agent into agent role
-- This fixes the role confusion where both "active_agent" and "agent" exist
-- Going forward: use "agent" role with agent_status (licensed/unlicensed) for distinction

BEGIN;

-- Step 1: Update users with active_agent role
-- Give them agent role (if not already) and ensure agent_status = licensed
UPDATE user_profiles
SET
  roles = CASE
    WHEN 'agent' = ANY(roles) THEN array_remove(roles, 'active_agent')
    ELSE array_remove(roles, 'active_agent') || ARRAY['agent']::text[]
  END,
  agent_status = 'licensed',
  updated_at = NOW()
WHERE 'active_agent' = ANY(roles);

-- Step 2: Update agent role display_name to be clearer
UPDATE roles
SET
  display_name = 'Agent',
  description = 'Licensed agent selling policies. Use agent_status for licensed/unlicensed distinction.',
  updated_at = NOW()
WHERE name = 'agent';

-- Step 3: Remove active_agent role permissions mappings
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE name = 'active_agent');

-- Step 4: Delete the active_agent role from roles table
DELETE FROM roles WHERE name = 'active_agent';

-- Step 5: Add comment for documentation
COMMENT ON COLUMN user_profiles.agent_status IS 'Agent licensing status: licensed (can sell), unlicensed (in training), not_applicable (non-agent roles)';

COMMIT;
