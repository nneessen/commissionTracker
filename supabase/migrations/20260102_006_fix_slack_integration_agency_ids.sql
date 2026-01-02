-- supabase/migrations/20260102_006_fix_slack_integration_agency_ids.sql
-- Fix Slack integration agency_id assignments
--
-- PROBLEM: Slack integrations have agency_id = NULL, causing them to be
-- treated as IMO-level (hierarchy_depth=999) instead of agency-specific (depth=0).
-- This prevents:
-- 1. Leaderboards from showing (only depth=0 gets leaderboard)
-- 2. Hierarchy traversal from working (parent agencies not found)

-- ============================================================================
-- 1. DIAGNOSTIC: Show current state of Slack integrations and agencies
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '========== CURRENT SLACK INTEGRATIONS ==========';
  FOR rec IN
    SELECT
      si.id,
      si.team_name,
      si.display_name,
      si.agency_id,
      a.name as linked_agency_name,
      CASE WHEN si.agency_id IS NULL THEN 'IMO-LEVEL' ELSE 'AGENCY-SPECIFIC' END as config_type
    FROM slack_integrations si
    LEFT JOIN agencies a ON si.agency_id = a.id
    WHERE si.is_active = true
    ORDER BY si.team_name
  LOOP
    RAISE NOTICE 'Workspace: %, Display: %, agency_id: %, linked_agency: %, type: %',
      rec.team_name, rec.display_name, rec.agency_id, rec.linked_agency_name, rec.config_type;
  END LOOP;

  RAISE NOTICE '========== AVAILABLE AGENCIES ==========';
  FOR rec IN
    SELECT
      a.id,
      a.name,
      a.parent_agency_id,
      pa.name as parent_name
    FROM agencies a
    LEFT JOIN agencies pa ON a.parent_agency_id = pa.id
    WHERE a.is_active = true
    ORDER BY a.name
  LOOP
    RAISE NOTICE 'Agency: % (id: %), parent: %',
      rec.name, rec.id, COALESCE(rec.parent_name, 'NONE - ROOT AGENCY');
  END LOOP;
END $$;

-- ============================================================================
-- 2. FIX: Assign agency_id to "The Standard" Slack workspace
-- ============================================================================

-- Find "The Standard" agency and assign it to "The Standard" Slack workspace
UPDATE slack_integrations si
SET agency_id = (
  SELECT a.id
  FROM agencies a
  WHERE a.name ILIKE '%The Standard%'
    AND a.imo_id = si.imo_id
  LIMIT 1
)
WHERE si.team_name ILIKE '%The Standard%'
  AND si.agency_id IS NULL
  AND EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.name ILIKE '%The Standard%'
      AND a.imo_id = si.imo_id
  );

-- ============================================================================
-- 3. FIX: Assign agency_id to "Self Made" Slack workspace (if it exists)
-- ============================================================================

-- Find "Self Made" agency and assign it to "Self Made" Slack workspace
-- NOTE: If "Self Made" should be IMO-level (catch-all), leave agency_id NULL
-- Only run this if you want Self Made to be agency-specific

UPDATE slack_integrations si
SET agency_id = (
  SELECT a.id
  FROM agencies a
  WHERE a.name ILIKE '%Self Made%'
    AND a.imo_id = si.imo_id
    AND a.parent_agency_id IS NULL  -- Root agency (no parent)
  LIMIT 1
)
WHERE si.team_name ILIKE '%Self Made%'
  AND si.agency_id IS NULL
  AND EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.name ILIKE '%Self Made%'
      AND a.imo_id = si.imo_id
      AND a.parent_agency_id IS NULL
  );

-- ============================================================================
-- 4. VERIFY: Show updated state
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '========== UPDATED SLACK INTEGRATIONS ==========';
  FOR rec IN
    SELECT
      si.id,
      si.team_name,
      si.display_name,
      si.agency_id,
      a.name as linked_agency_name,
      a.parent_agency_id,
      pa.name as parent_agency_name,
      CASE WHEN si.agency_id IS NULL THEN 'IMO-LEVEL' ELSE 'AGENCY-SPECIFIC' END as config_type
    FROM slack_integrations si
    LEFT JOIN agencies a ON si.agency_id = a.id
    LEFT JOIN agencies pa ON a.parent_agency_id = pa.id
    WHERE si.is_active = true
    ORDER BY si.team_name
  LOOP
    RAISE NOTICE 'Workspace: %, agency_id: %, linked_agency: %, parent: %, type: %',
      rec.team_name, rec.agency_id, rec.linked_agency_name,
      COALESCE(rec.parent_agency_name, 'NONE'), rec.config_type;
  END LOOP;
END $$;

-- ============================================================================
-- Expected result after fix:
-- - "The Standard" workspace: agency_id = <The Standard agency UUID>, type = AGENCY-SPECIFIC
-- - "Self Made" workspace: agency_id = <Self Made agency UUID> OR NULL for IMO-level
--
-- With correct agency_id set:
-- - hierarchy_depth for "The Standard" = 0 (direct agency, with leaderboard)
-- - hierarchy_depth for "Self Made" = 1 (parent agency, no leaderboard)
--   OR 999 if kept as IMO-level
-- ============================================================================
