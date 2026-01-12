-- Phase 8: Recruiting Pipeline Org Awareness
-- Migration 1 of 2: Add org columns and populate from user_profiles

-- ============================================================================
-- 1. Add agency_id and imo_id columns to recruit_phase_progress
-- ============================================================================

ALTER TABLE recruit_phase_progress
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imo_id uuid REFERENCES imos(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. Add agency_id and imo_id columns to recruit_checklist_progress
-- ============================================================================

ALTER TABLE recruit_checklist_progress
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imo_id uuid REFERENCES imos(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. Create indexes for org filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_agency_id
  ON recruit_phase_progress(agency_id) WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_imo_id
  ON recruit_phase_progress(imo_id) WHERE imo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruit_phase_progress_imo_status
  ON recruit_phase_progress(imo_id, status) WHERE imo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_agency_id
  ON recruit_checklist_progress(agency_id) WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_imo_id
  ON recruit_checklist_progress(imo_id) WHERE imo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recruit_checklist_progress_imo_status
  ON recruit_checklist_progress(imo_id, status) WHERE imo_id IS NOT NULL;

-- ============================================================================
-- 4. Backfill existing data from user_profiles
-- ============================================================================

-- Backfill recruit_phase_progress
UPDATE recruit_phase_progress rpp
SET
  agency_id = up.agency_id,
  imo_id = up.imo_id
FROM user_profiles up
WHERE rpp.user_id = up.id
  AND (rpp.agency_id IS NULL OR rpp.imo_id IS NULL);

-- Backfill recruit_checklist_progress
UPDATE recruit_checklist_progress rcp
SET
  agency_id = up.agency_id,
  imo_id = up.imo_id
FROM user_profiles up
WHERE rcp.user_id = up.id
  AND (rcp.agency_id IS NULL OR rcp.imo_id IS NULL);

-- ============================================================================
-- 5. Create trigger function to auto-populate org columns on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_recruiting_progress_org_ids()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
  v_imo_id uuid;
BEGIN
  -- Get org IDs from the user's profile
  SELECT agency_id, imo_id INTO v_agency_id, v_imo_id
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Set org columns
  NEW.agency_id := COALESCE(NEW.agency_id, v_agency_id);
  NEW.imo_id := COALESCE(NEW.imo_id, v_imo_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Attach triggers to both tables
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_recruit_phase_progress_org_ids ON recruit_phase_progress;
DROP TRIGGER IF EXISTS trigger_set_recruit_checklist_progress_org_ids ON recruit_checklist_progress;

-- Create triggers for INSERT
CREATE TRIGGER trigger_set_recruit_phase_progress_org_ids
  BEFORE INSERT ON recruit_phase_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_recruiting_progress_org_ids();

CREATE TRIGGER trigger_set_recruit_checklist_progress_org_ids
  BEFORE INSERT ON recruit_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_recruiting_progress_org_ids();

-- ============================================================================
-- 7. Note: No explicit GRANT needed for trigger function
-- ============================================================================
-- Trigger functions are invoked by the database engine, not by users directly.
-- The SECURITY DEFINER attribute handles the necessary privileges.
