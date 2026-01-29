-- supabase/migrations/20260129124021_fix_phase_progress_imo_id.sql
-- Fix: Ensure recruit_phase_progress records have imo_id for RLS policies
--
-- Problem: Progress records were created without imo_id, causing trainers/staff
-- to not see recruits' pipeline progress due to RLS policy requirements.
--
-- Solution: Backfill existing records with imo_id from user_profiles

-- Backfill imo_id on all progress records that are missing it
UPDATE recruit_phase_progress rpp
SET imo_id = up.imo_id
FROM user_profiles up
WHERE rpp.user_id = up.id
  AND rpp.imo_id IS NULL
  AND up.imo_id IS NOT NULL;

-- Backfill agency_id on all progress records that are missing it
UPDATE recruit_phase_progress rpp
SET agency_id = up.agency_id
FROM user_profiles up
WHERE rpp.user_id = up.id
  AND rpp.agency_id IS NULL
  AND up.agency_id IS NOT NULL;
