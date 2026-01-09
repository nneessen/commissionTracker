-- supabase/migrations/20260109_005_guide_parsing_indexes.sql
-- Additional indexes for underwriting_guides table to optimize parsing and AI queries

-- Compound index for IMO + status + carrier queries (used by AI analyzer)
CREATE INDEX IF NOT EXISTS idx_guides_imo_status_carrier
  ON underwriting_guides(imo_id, parsing_status, carrier_id)
  WHERE parsing_status = 'completed';

-- Comment on indexes for documentation
COMMENT ON INDEX idx_guides_imo_status_carrier IS 'Optimizes AI analyzer queries that filter guides by IMO, completed status, and carrier';
