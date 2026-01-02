-- supabase/migrations/20260102_007_fix_self_made_slack_agency.sql
-- Fix "💎 SELF MADE 💎" Slack workspace to point to correct agency

-- Currently both workspaces point to "The Standard" agency (aaaaaaaa-...)
-- "💎 SELF MADE 💎" should point to "Self Made Financial" agency (6ddfff47-...)

-- ============================================================================
-- 1. Fix "💎 SELF MADE 💎" workspace to point to "Self Made Financial" agency
-- ============================================================================

UPDATE slack_integrations
SET agency_id = '6ddfff47-914e-4648-b0c6-89c173fe1600'  -- Self Made Financial agency ID
WHERE team_name ILIKE '%SELF MADE%'
  AND team_name NOT ILIKE '%The Standard%';

-- ============================================================================
-- 2. Verify the fix
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '========== FINAL SLACK INTEGRATION CONFIG ==========';
  FOR rec IN
    SELECT
      si.team_name,
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
    RAISE NOTICE 'Workspace: % → agency: % (parent: %), type: %',
      rec.team_name,
      rec.linked_agency_name,
      COALESCE(rec.parent_agency_name, 'NONE - ROOT'),
      rec.config_type;
  END LOOP;
END $$;

-- ============================================================================
-- Expected hierarchy after fix:
--
-- Agent in "The Standard" agency:
--   1. "The Standard" workspace (depth=0, direct agency) → WITH leaderboard
--   2. "💎 SELF MADE 💎" workspace (depth=1, parent) → NO leaderboard
--
-- Agent in "Self Made Financial" directly:
--   1. "💎 SELF MADE 💎" workspace (depth=0, direct) → WITH leaderboard
-- ============================================================================
