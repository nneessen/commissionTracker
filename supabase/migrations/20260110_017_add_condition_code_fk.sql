-- Migration: 20260110_017_add_condition_code_fk.sql
-- Description: Add FK relationship between carrier_condition_acceptance.condition_code and underwriting_health_conditions.code
-- This enables Supabase embedded joins in queries

-- Step 1: Ensure code column in underwriting_health_conditions is unique
-- (It should already be, but let's make sure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'underwriting_health_conditions'
    AND indexname = 'underwriting_health_conditions_code_key'
  ) THEN
    ALTER TABLE underwriting_health_conditions
    ADD CONSTRAINT underwriting_health_conditions_code_key UNIQUE (code);
  END IF;
END $$;

-- Step 2: Add FK relationship from carrier_condition_acceptance.condition_code to underwriting_health_conditions.code
-- This allows PostgREST to auto-detect the relationship for embedded selects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'carrier_condition_acceptance_condition_code_fkey'
    AND table_name = 'carrier_condition_acceptance'
  ) THEN
    ALTER TABLE carrier_condition_acceptance
    ADD CONSTRAINT carrier_condition_acceptance_condition_code_fkey
    FOREIGN KEY (condition_code) REFERENCES underwriting_health_conditions(code)
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Note: Ensure all condition_code values in carrier_condition_acceptance exist in underwriting_health_conditions
-- before applying this migration. Run this query to check:
-- SELECT DISTINCT condition_code FROM carrier_condition_acceptance
-- WHERE condition_code NOT IN (SELECT code FROM underwriting_health_conditions);
