-- Drop dead indexes and create correct composite indexes
-- This file must be run OUTSIDE a transaction to allow CREATE INDEX CONCURRENTLY
-- Run with: ./scripts/migrations/run-sql.sh -f supabase/migrations/20260213192050_fix_dead_indexes_concurrently.sql

-- =====================================================
-- 1. Drop dead indexes (WHERE status = 'active' matches zero rows)
--    After Feb 4 decoupling migration, all active statuses moved to
--    lifecycle_status = 'active' (status column no longer holds 'active')
-- =====================================================

DROP INDEX IF EXISTS idx_policies_effective_date;
DROP INDEX IF EXISTS idx_policies_imo_effective_date;

-- Drop old single-column index now subsumed by composite idx_commissions_user_payment
DROP INDEX IF EXISTS idx_commissions_payment_date;

-- =====================================================
-- 2. Create correct composite indexes CONCURRENTLY (no write locks)
-- =====================================================

-- Primary composite for leaderboard/dashboard IP queries
-- (JOIN on user_id + filter lifecycle_status + range scan on effective_date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_user_lifecycle_effective
ON policies(user_id, lifecycle_status, effective_date DESC)
WHERE lifecycle_status IS NOT NULL;

-- For Pending AP queries (JOIN on user_id + filter status = 'pending')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_user_status_pending
ON policies(user_id, status)
WHERE status = 'pending';

-- For IMO-scoped production queries (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_imo_lifecycle_effective
ON policies(imo_id, lifecycle_status, effective_date DESC)
WHERE lifecycle_status = 'active';

-- For commission aggregation queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissions_user_payment
ON commissions(user_id, payment_date);

-- For recruit/pipeline counting in leaderboard functions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_recruiter
ON user_profiles(recruiter_id)
WHERE recruiter_id IS NOT NULL;
