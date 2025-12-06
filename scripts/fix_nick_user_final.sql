-- /home/nneessen/projects/commissionTracker/scripts/fix_nick_user_final.sql
-- FINAL fix for nick.neessen@gmail.com to be a proper active agent

-- 1. Check current state
SELECT
  id,
  email,
  roles,
  agent_status,
  approval_status,
  contract_level,
  onboarding_status,
  current_onboarding_phase,
  user_id
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- 2. Fix the user profile completely
UPDATE user_profiles
SET
  roles = ARRAY['active_agent']::text[],
  agent_status = 'licensed',
  approval_status = 'approved',
  contract_level = 100,
  onboarding_status = NULL,  -- CRITICAL: Clear this so they don't show in recruiting
  current_onboarding_phase = NULL,  -- CRITICAL: Clear this too
  onboarding_started_at = NULL,  -- Clear all onboarding fields
  is_admin = false
WHERE email = 'nick.neessen@gmail.com';

-- 3. Verify the fix
SELECT
  id,
  email,
  roles,
  agent_status,
  approval_status,
  contract_level,
  onboarding_status,
  current_onboarding_phase
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com';

-- 4. Verify they DON'T show in recruiting pipeline query
SELECT
  email,
  roles,
  onboarding_status,
  CASE
    WHEN 'recruit' = ANY(roles) THEN 'Shows because has recruit role'
    WHEN onboarding_status IS NOT NULL THEN 'Shows because has onboarding_status'
    ELSE 'Does NOT show in recruiting'
  END as recruiting_reason
FROM user_profiles
WHERE email = 'nick.neessen@gmail.com'
  AND ('recruit' = ANY(roles) OR onboarding_status IS NOT NULL);

-- Should return 0 rows if fixed properly!

-- 5. Check if auth user exists
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'nick.neessen@gmail.com';

-- 6. If auth user exists, link to profile
UPDATE user_profiles
SET user_id = (
  SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com'
)
WHERE email = 'nick.neessen@gmail.com'
  AND user_id IS NULL;