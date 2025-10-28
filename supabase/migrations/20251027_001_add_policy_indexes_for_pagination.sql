-- Migration: Add indexes for policies table to improve pagination and filtering performance
-- Created: 2025-10-27
-- Purpose: Support server-side pagination with efficient filtering on commonly used fields

-- Create indexes for frequently filtered columns
-- These will significantly improve query performance when filtering/sorting policies

-- Index on status (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_policies_status
ON policies(status);

-- Index on carrier_id (join and filter operations)
CREATE INDEX IF NOT EXISTS idx_policies_carrier_id
ON policies(carrier_id);

-- Index on product_id (filter operations)
CREATE INDEX IF NOT EXISTS idx_policies_product_id
ON policies(product_id);

-- Index on effective_date (date range filtering and sorting)
CREATE INDEX IF NOT EXISTS idx_policies_effective_date
ON policies(effective_date);

-- Index on created_at for default sorting
CREATE INDEX IF NOT EXISTS idx_policies_created_at
ON policies(created_at DESC);

-- Index on user_id for RLS performance
CREATE INDEX IF NOT EXISTS idx_policies_user_id
ON policies(user_id);

-- Composite index for common filter combinations
-- User + status is a very common query pattern
CREATE INDEX IF NOT EXISTS idx_policies_user_status
ON policies(user_id, status);

-- Composite index for date range queries with user filter
CREATE INDEX IF NOT EXISTS idx_policies_user_effective_date
ON policies(user_id, effective_date);

-- Add comment to document purpose
COMMENT ON INDEX idx_policies_status IS 'Improves filtering by policy status';
COMMENT ON INDEX idx_policies_carrier_id IS 'Improves joins and filtering by carrier';
COMMENT ON INDEX idx_policies_product_id IS 'Improves filtering by product';
COMMENT ON INDEX idx_policies_effective_date IS 'Improves date range filtering and sorting';
COMMENT ON INDEX idx_policies_created_at IS 'Improves default sorting by creation date';
COMMENT ON INDEX idx_policies_user_id IS 'Improves RLS policy performance';
COMMENT ON INDEX idx_policies_user_status IS 'Optimizes common user+status filter pattern';
COMMENT ON INDEX idx_policies_user_effective_date IS 'Optimizes user-specific date range queries';