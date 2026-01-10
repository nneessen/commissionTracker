-- supabase/migrations/reverts/20260110_012_criteria_decision_index.sql
-- Revert: Remove indexes added for criteria decision engine

-- Remove index for active criteria lookup by carrier
DROP INDEX CONCURRENTLY IF EXISTS idx_criteria_active_carrier;

-- Remove index for IMO + active lookup
DROP INDEX CONCURRENTLY IF EXISTS idx_criteria_imo_active;
