-- supabase/migrations/reverts/20260102_005_revert_slack_hierarchy_leaderboard.sql
-- Revert: Remove hierarchy_depth column from daily_sales_logs
--
-- This reverts the changes from 20260102_005_fix_slack_hierarchy_leaderboard.sql
-- Run this if you need to roll back the hierarchy-based leaderboard logic

-- ============================================================================
-- 1. Drop the index first
-- ============================================================================

DROP INDEX IF EXISTS idx_daily_sales_logs_hierarchy_depth;

-- ============================================================================
-- 2. Remove the hierarchy_depth column
-- ============================================================================

ALTER TABLE daily_sales_logs DROP COLUMN IF EXISTS hierarchy_depth;

-- ============================================================================
-- NOTE: After running this revert migration, you must:
-- 1. Revert the edge function changes in slack-policy-notification/index.ts
-- 2. Regenerate database types: npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
-- 3. Run npm run build to verify no TypeScript errors
-- ============================================================================
