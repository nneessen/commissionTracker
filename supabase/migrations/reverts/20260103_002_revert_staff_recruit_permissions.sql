-- Revert: Staff Recruit Management Permissions
-- Date: 2026-01-03
-- Reverts: 20260103_002_staff_recruit_management_permissions.sql

-- Remove staff policies from user_profiles
DROP POLICY IF EXISTS "Staff can update recruits in own IMO" ON user_profiles;

-- Remove staff policies from recruit_phase_progress
DROP POLICY IF EXISTS "Staff can update phase_progress in own IMO" ON recruit_phase_progress;
DROP POLICY IF EXISTS "Staff can view phase_progress in own IMO" ON recruit_phase_progress;

-- Remove staff policies from recruit_checklist_progress
DROP POLICY IF EXISTS "Staff can update checklist_progress in own IMO" ON recruit_checklist_progress;
DROP POLICY IF EXISTS "Staff can view checklist_progress in own IMO" ON recruit_checklist_progress;

-- Remove helper function
DROP FUNCTION IF EXISTS is_staff_role();
