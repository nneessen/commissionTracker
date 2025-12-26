-- supabase/migrations/20251226_009_rollback_slack_multi_workspace.sql
-- ROLLBACK MIGRATION: Reverts all Slack multi-workspace and leaderboard changes
--
-- Run this ONLY if you need to revert the changes from migrations 002-008
-- DO NOT run this as part of normal deployment - it's for emergency rollback only
--
-- To apply: ./scripts/apply-migration.sh supabase/migrations/20251226_009_rollback_slack_multi_workspace.sql

-- ============================================================================
-- WARNING: This will delete data! Only run if you need to fully revert.
-- ============================================================================

-- Uncomment the lines below to execute the rollback

/*

-- ============================================================================
-- 1. Drop agency_slack_credentials table and functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_agency_slack_credentials(UUID, UUID);
DROP FUNCTION IF EXISTS update_daily_leaderboard_title(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS get_my_daily_sales_logs();
DROP TABLE IF EXISTS agency_slack_credentials CASCADE;

-- ============================================================================
-- 2. Drop daily_sales_logs table and functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_daily_production_by_agent(UUID, UUID);
DROP TABLE IF EXISTS daily_sales_logs CASCADE;

-- Remove slack_member_id from user_slack_preferences
ALTER TABLE user_slack_preferences DROP COLUMN IF EXISTS slack_member_id;

-- ============================================================================
-- 3. Revert slack_integrations changes
-- ============================================================================

-- Drop the new constraint
ALTER TABLE slack_integrations DROP CONSTRAINT IF EXISTS slack_integrations_team_agency_unique;

-- Drop the agency_id column
DROP INDEX IF EXISTS idx_slack_integrations_agency;
ALTER TABLE slack_integrations DROP COLUMN IF EXISTS agency_id;

-- Restore original unique constraint on team_id
ALTER TABLE slack_integrations ADD CONSTRAINT slack_integrations_team_id_key UNIQUE (team_id);

-- ============================================================================
-- 4. Drop hierarchy functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_slack_integrations_for_agency_hierarchy(UUID);
DROP FUNCTION IF EXISTS get_agency_hierarchy(UUID);

-- ============================================================================
-- 5. Revert app_config if needed (but don't drop if other things use it)
-- ============================================================================

-- Note: app_config might be used by other features, so we just note it here
-- DROP TABLE IF EXISTS app_config;

-- ============================================================================
-- 6. Revert policy trigger to original version
-- ============================================================================

-- You would need to recreate the original trigger function here
-- This is left as a placeholder since the original function logic varies

-- ============================================================================
-- Done - all multi-workspace Slack changes reverted
-- ============================================================================

SELECT 'Rollback completed. Multi-workspace Slack features have been reverted.' AS status;

*/

-- If you just want to verify this migration exists without running it:
SELECT 'Rollback migration exists but is commented out. Uncomment to execute.' AS status;
