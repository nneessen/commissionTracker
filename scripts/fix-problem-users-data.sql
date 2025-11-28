-- /home/nneessen/projects/commissionTracker/scripts/fix-problem-users-data.sql
-- Script to fix data inconsistency for users with 'agent' role but incomplete onboarding
-- Problem: nick.neessen@gmail.com and nickneessen.ffl@gmail.com have roles=['agent']
--          but onboarding_status='lead'/'active' (should be 'completed')
--
-- Choose ONE of the following options:

-- =================================================================
-- OPTION 1: Make them recruits again (remove agent role)
-- =================================================================
-- Use this if they haven't actually completed bootcamp and graduated
-- This will make them appear in the Recruiting Pipeline tab

-- UPDATE user_profiles
-- SET roles = NULL
-- WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com');


-- =================================================================
-- OPTION 2: Complete their onboarding properly (RECOMMENDED)
-- =================================================================
-- Use this if they have completed bootcamp and should be active agents
-- This will make them appear in the Users & Access tab as active agents

UPDATE user_profiles
SET
  onboarding_status = 'completed',
  current_onboarding_phase = 'Completed',
  onboarding_completed_at = NOW()
WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com')
  AND roles @> ARRAY['agent']::text[];  -- Only update if they have agent role

-- =================================================================
-- VERIFICATION QUERY
-- =================================================================
-- Run this after applying the fix to verify the changes

SELECT
  email,
  roles,
  onboarding_status,
  current_onboarding_phase,
  onboarding_completed_at,
  approval_status,
  is_admin
FROM user_profiles
WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com')
ORDER BY email;
