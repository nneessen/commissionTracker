-- supabase/migrations/20260220093329_add_contract_request_filter_indexes.sql
-- Add performance indexes for contract request filtering

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index for filter queries (status + dates)
CREATE INDEX IF NOT EXISTS idx_contract_requests_status_dates
ON carrier_contract_requests(status, requested_date DESC);

-- Text search index for writing numbers (fuzzy matching)
CREATE INDEX IF NOT EXISTS idx_contract_requests_writing_number_gin
ON carrier_contract_requests USING gin (writing_number gin_trgm_ops);

-- Index for carrier_id filtering
CREATE INDEX IF NOT EXISTS idx_contract_requests_carrier_id
ON carrier_contract_requests(carrier_id);

-- Index for recruit_id (should already exist, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_contract_requests_recruit_id
ON carrier_contract_requests(recruit_id);
