-- REVERT MIGRATION: 20251231_002_add_commission_profile_indexes.sql
-- Purpose: Remove performance indexes if they cause issues
--
-- WARNING: Only use this for emergency rollback.
-- Removing these indexes will significantly degrade query performance.

-- Drop all indexes added in the forward migration
DROP INDEX IF EXISTS public.idx_policies_user_effective_status;
DROP INDEX IF EXISTS public.idx_policies_user_status_premium;
DROP INDEX IF EXISTS public.idx_comp_guide_lookup;
DROP INDEX IF EXISTS public.idx_comp_guide_contract_level;

-- Verify indexes were dropped
-- Run: SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%commission%';
-- Expected result: 0 rows
