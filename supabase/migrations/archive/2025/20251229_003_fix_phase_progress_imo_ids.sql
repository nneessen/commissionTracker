-- supabase/migrations/20251229_003_fix_phase_progress_imo_ids.sql
-- Fix NULL imo_id values in recruit_phase_progress table
-- This is blocking trainers from seeing phase progress due to RLS policies

-- Step 1: Update all recruit_phase_progress records to inherit imo_id from user_profiles
UPDATE recruit_phase_progress rpp
SET
  imo_id = up.imo_id,
  agency_id = COALESCE(rpp.agency_id, up.agency_id)
FROM user_profiles up
WHERE rpp.user_id = up.id
  AND (rpp.imo_id IS NULL OR rpp.agency_id IS NULL);

-- Step 2: Create or replace the trigger function to auto-populate imo_id on insert
CREATE OR REPLACE FUNCTION populate_phase_progress_imo_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get imo_id and agency_id from user profile if not set
  IF NEW.imo_id IS NULL OR NEW.agency_id IS NULL THEN
    SELECT imo_id, agency_id INTO NEW.imo_id, NEW.agency_id
    FROM user_profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-populate on insert
DROP TRIGGER IF EXISTS set_phase_progress_imo_id ON recruit_phase_progress;
CREATE TRIGGER set_phase_progress_imo_id
  BEFORE INSERT ON recruit_phase_progress
  FOR EACH ROW
  EXECUTE FUNCTION populate_phase_progress_imo_id();

-- Verify the fix
SELECT
  up.email,
  COUNT(*) as total_records,
  COUNT(rpp.imo_id) as records_with_imo
FROM recruit_phase_progress rpp
JOIN user_profiles up ON rpp.user_id = up.id
GROUP BY up.email
ORDER BY up.email
LIMIT 10;
