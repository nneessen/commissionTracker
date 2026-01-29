-- supabase/migrations/20260129081122_fix_submit_recruit_registration_overload.sql
-- Fix: Drop duplicate submit_recruit_registration function (JSON version)
-- The JSONB version is the correct one to keep

-- Drop the old JSON version that's causing the PGRST203 overload conflict
DROP FUNCTION IF EXISTS submit_recruit_registration(UUID, JSON);

-- Verify only the JSONB version remains
COMMENT ON FUNCTION submit_recruit_registration(UUID, JSONB) IS
  'Submits recruit registration form data. Creates auth user and updates recruit profile.';
