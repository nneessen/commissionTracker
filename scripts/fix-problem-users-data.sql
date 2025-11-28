-- /home/nneessen/projects/commissionTracker/scripts/fix-problem-users-data.sql
-- Script to fix data inconsistency for users with 'agent' role but incomplete onboarding
-- Problem: nick.neessen@gmail.com and nickneessen.ffl@gmail.com have roles=['agent']
--          but they are still recruits (haven't completed bootcamp)
-- Solution: REMOVE the agent role to make them recruits again

BEGIN;

-- =================================================================
-- Fix: Make them recruits again (remove agent role)
-- =================================================================
-- These users were incorrectly given the 'agent' role
-- They should be recruits in the pipeline until they complete bootcamp

UPDATE user_profiles
SET roles = NULL
WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com');

COMMIT;

-- =================================================================
-- VERIFICATION QUERY
-- =================================================================
-- Run this after applying the fix to verify the changes

SELECT
  email,
  roles,
  onboarding_status,
  current_onboarding_phase,
  approval_status,
  is_admin
FROM user_profiles
ORDER BY email;
