-- supabase/migrations/20260110_012_criteria_decision_index.sql
-- Add index for efficient active criteria lookup by carrier in underwriting analysis

-- Index for efficient active criteria lookup by carrier
-- Used by underwriting-ai-analyze Edge Function to fetch active criteria for eligible carriers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_criteria_active_carrier
  ON carrier_underwriting_criteria(carrier_id, is_active)
  WHERE is_active = TRUE;

COMMENT ON INDEX idx_criteria_active_carrier IS
  'Optimizes active criteria lookup for underwriting analysis - filters by carrier_id where is_active=true';

-- Also add index for IMO + active lookup (common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_criteria_imo_active
  ON carrier_underwriting_criteria(imo_id, is_active)
  WHERE is_active = TRUE;

COMMENT ON INDEX idx_criteria_imo_active IS
  'Optimizes active criteria lookup by IMO for underwriting analysis';
