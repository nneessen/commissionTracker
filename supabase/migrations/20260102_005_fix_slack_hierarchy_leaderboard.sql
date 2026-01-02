-- supabase/migrations/20260102_005_fix_slack_hierarchy_leaderboard.sql
-- Fix Slack policy notification routing: only show leaderboard for direct agency
--
-- PROBLEM: Policies from agents without agency are being posted to "The Standard" Slack
-- instead of the IMO-level "Self Made" Slack. Additionally, parent agency posts should
-- not include leaderboards.
--
-- SOLUTION:
-- 1. Add hierarchy_depth column to daily_sales_logs to track integration level
-- 2. Provide manual data fix query for production (The Standard config)

-- ============================================================================
-- 1. Add hierarchy_depth to daily_sales_logs for tracking integration level
-- ============================================================================

ALTER TABLE daily_sales_logs
ADD COLUMN IF NOT EXISTS hierarchy_depth INTEGER DEFAULT 0;

COMMENT ON COLUMN daily_sales_logs.hierarchy_depth IS
  'Hierarchy depth of the integration: 0 = direct agency (with leaderboard), >0 = parent agency (no leaderboard), 999 = IMO-level (no leaderboard)';

-- Index for potential queries filtering by hierarchy_depth
CREATE INDEX IF NOT EXISTS idx_daily_sales_logs_hierarchy_depth
  ON daily_sales_logs(hierarchy_depth);

-- ============================================================================
-- 2. MANUAL DATA FIX FOR PRODUCTION (Run after verifying IDs)
-- ============================================================================
--
-- First, verify current Slack integration configuration:
--
-- SELECT
--   si.id,
--   si.team_name,
--   si.display_name,
--   si.agency_id,
--   a.name as agency_name,
--   i.name as imo_name,
--   CASE WHEN si.agency_id IS NULL THEN 'IMO-LEVEL' ELSE 'AGENCY-SPECIFIC' END as config_type
-- FROM slack_integrations si
-- LEFT JOIN agencies a ON si.agency_id = a.id
-- LEFT JOIN imos i ON si.imo_id = i.id
-- WHERE si.is_active = true
-- ORDER BY si.agency_id NULLS FIRST;
--
-- If "The Standard" workspace shows as IMO-LEVEL (agency_id = NULL),
-- fix it by assigning the correct agency_id:
--
-- UPDATE slack_integrations si
-- SET agency_id = (
--   SELECT a.id FROM agencies a
--   WHERE a.name ILIKE '%The Standard%'
--     AND a.imo_id = si.imo_id
--   LIMIT 1
-- )
-- WHERE si.team_name ILIKE '%The Standard%'
--   AND si.agency_id IS NULL;
--
-- Verify after update that:
-- - "The Standard" workspace has agency_id set to The Standard agency ID
-- - "Self Made" workspace (if exists) has agency_id = NULL (IMO-level)

-- ============================================================================
-- 3. Grant permissions
-- ============================================================================

-- No new permissions needed - daily_sales_logs already has appropriate RLS
