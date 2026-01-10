-- supabase/migrations/reverts/20260110_009_carrier_underwriting_criteria.sql
-- Revert migration: Drop carrier_underwriting_criteria table and all related objects

-- Drop the unique constraint index
DROP INDEX IF EXISTS idx_criteria_unique_active;

-- Drop the trigger
DROP TRIGGER IF EXISTS update_criteria_updated_at ON carrier_underwriting_criteria;

-- Drop all RLS policies
DROP POLICY IF EXISTS "Users can view own IMO criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can insert criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can update criteria" ON carrier_underwriting_criteria;
DROP POLICY IF EXISTS "IMO admins can delete criteria" ON carrier_underwriting_criteria;

-- Drop all indexes
DROP INDEX IF EXISTS idx_criteria_imo;
DROP INDEX IF EXISTS idx_criteria_carrier;
DROP INDEX IF EXISTS idx_criteria_guide;
DROP INDEX IF EXISTS idx_criteria_product;
DROP INDEX IF EXISTS idx_criteria_extraction_status;
DROP INDEX IF EXISTS idx_criteria_review_status;
DROP INDEX IF EXISTS idx_criteria_active;
DROP INDEX IF EXISTS idx_criteria_imo_status;

-- Drop the table (this will cascade to drop dependent objects)
DROP TABLE IF EXISTS carrier_underwriting_criteria;
