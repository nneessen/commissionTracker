-- Reset Recruit Progress Script
-- This script resets ALL recruits back to the initial phase (Phone Interview)
-- and clears all checklist completion progress.
--
-- Usage: Run this in psql or Supabase SQL editor
-- WARNING: This is destructive and cannot be undone!

BEGIN;

-- 1. Get the first phase (Phone Interview, phase_order = 1)
WITH first_phase AS (
  SELECT id, phase_name
  FROM pipeline_phases
  WHERE phase_order = 1
  LIMIT 1
)

-- 2. Reset recruit_phase_progress
-- Set first phase to 'in_progress', all others to 'not_started'
UPDATE recruit_phase_progress rpp
SET
  status = CASE
    WHEN pp.phase_order = 1 THEN 'in_progress'
    ELSE 'not_started'
  END,
  started_at = CASE
    WHEN pp.phase_order = 1 THEN NOW()
    ELSE NULL
  END,
  completed_at = NULL,
  blocked_reason = NULL,
  notes = NULL,
  updated_at = NOW()
FROM pipeline_phases pp
WHERE rpp.phase_id = pp.id;

-- 3. Reset recruit_checklist_progress
-- Clear all completion data, reset status to 'not_started'
UPDATE recruit_checklist_progress
SET
  status = 'not_started',
  completed_at = NULL,
  completed_by = NULL,
  verified_at = NULL,
  verified_by = NULL,
  rejection_reason = NULL,
  document_id = NULL,
  notes = NULL,
  metadata = NULL,
  updated_at = NOW();

-- 4. Reset user_profiles onboarding status for all recruits
UPDATE user_profiles
SET
  onboarding_status = 'interview_1',
  current_onboarding_phase = 'Phone Interview',
  onboarding_completed_at = NULL
WHERE 'recruit' = ANY(roles)
  AND onboarding_status IS NOT NULL;

-- Summary of changes
SELECT 'Phase Progress Reset' as action, COUNT(*) as count FROM recruit_phase_progress
UNION ALL
SELECT 'Checklist Progress Reset', COUNT(*) FROM recruit_checklist_progress
UNION ALL
SELECT 'User Profiles Reset', COUNT(*) FROM user_profiles WHERE 'recruit' = ANY(roles) AND onboarding_status IS NOT NULL;

COMMIT;
