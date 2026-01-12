-- supabase/migrations/20251231_002_fix_checklist_progress_org_ids.sql
-- Fix: Backfill imo_id/agency_id on recruit_checklist_progress and recruit_phase_progress
-- Issue: Records with NULL imo_id are invisible to trainers due to RLS policy requiring imo_id match

-- ============================================================================
-- 1. BACKFILL recruit_checklist_progress with NULL imo_id/agency_id
-- ============================================================================

UPDATE recruit_checklist_progress rcp
SET
  imo_id = up.imo_id,
  agency_id = up.agency_id
FROM user_profiles up
WHERE rcp.user_id = up.id
  AND (rcp.imo_id IS NULL OR rcp.agency_id IS NULL);

-- Log how many records were updated
DO $$
DECLARE
  v_checklist_count INT;
BEGIN
  GET DIAGNOSTICS v_checklist_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % recruit_checklist_progress records with org IDs', v_checklist_count;
END $$;

-- ============================================================================
-- 2. BACKFILL recruit_phase_progress with NULL imo_id/agency_id
-- ============================================================================

UPDATE recruit_phase_progress rpp
SET
  imo_id = up.imo_id,
  agency_id = up.agency_id
FROM user_profiles up
WHERE rpp.user_id = up.id
  AND (rpp.imo_id IS NULL OR rpp.agency_id IS NULL);

-- Log how many records were updated
DO $$
DECLARE
  v_phase_count INT;
BEGIN
  GET DIAGNOSTICS v_phase_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled % recruit_phase_progress records with org IDs', v_phase_count;
END $$;

-- ============================================================================
-- 3. ENSURE TRIGGER EXISTS (recreate if missing)
-- ============================================================================

-- Recreate the trigger function to ensure it's current
CREATE OR REPLACE FUNCTION set_recruiting_progress_org_ids()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
BEGIN
  -- Only set if not already provided
  IF NEW.imo_id IS NULL OR NEW.agency_id IS NULL THEN
    -- Get org IDs from the user's profile
    SELECT agency_id, imo_id INTO v_agency_id, v_imo_id
    FROM user_profiles
    WHERE id = NEW.user_id;

    -- Set org columns if not already set
    NEW.agency_id := COALESCE(NEW.agency_id, v_agency_id);
    NEW.imo_id := COALESCE(NEW.imo_id, v_imo_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers are attached
DROP TRIGGER IF EXISTS trigger_set_recruit_phase_progress_org_ids ON recruit_phase_progress;
CREATE TRIGGER trigger_set_recruit_phase_progress_org_ids
  BEFORE INSERT ON recruit_phase_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_recruiting_progress_org_ids();

DROP TRIGGER IF EXISTS trigger_set_recruit_checklist_progress_org_ids ON recruit_checklist_progress;
CREATE TRIGGER trigger_set_recruit_checklist_progress_org_ids
  BEFORE INSERT ON recruit_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_recruiting_progress_org_ids();

-- ============================================================================
-- 4. ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION set_recruiting_progress_org_ids() IS
  'Trigger function to auto-populate imo_id and agency_id from user_profiles on insert.
   Required for RLS policies that filter by org membership.';
