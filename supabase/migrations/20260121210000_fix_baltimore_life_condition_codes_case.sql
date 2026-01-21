-- supabase/migrations/20260121210000_fix_baltimore_life_condition_codes_case.sql
-- Fix Baltimore Life condition codes to use lowercase (matches standard convention)
--
-- ISSUE: Baltimore Life rules were created with UPPERCASE condition codes
-- (e.g., 'COPD', 'ADL_IMPAIRMENT') but standard conditions use lowercase
-- (e.g., 'copd', 'adl_impairment'). This causes lookupAcceptance to fail
-- because the query uses exact case matching.
--
-- FIX: Update all Baltimore Life rules to use lowercase condition codes.
-- Must update health conditions FIRST (before acceptance rules) due to FK constraint.

BEGIN;

-- Step 1: For UPPERCASE health conditions that DON'T have lowercase equivalents,
-- rename them to lowercase
DO $$
DECLARE
  v_updated_count INTEGER := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE 'Step 1: Converting UPPERCASE health conditions to lowercase...';

  FOR rec IN
    SELECT code, name, category, is_active, risk_weight, follow_up_schema
    FROM underwriting_health_conditions
    WHERE code ~ '[A-Z]'  -- contains uppercase
      AND NOT EXISTS (
        SELECT 1 FROM underwriting_health_conditions lc
        WHERE lc.code = LOWER(underwriting_health_conditions.code)
      )
  LOOP
    -- Update the code to lowercase
    UPDATE underwriting_health_conditions
    SET code = LOWER(code)
    WHERE code = rec.code;
    v_updated_count := v_updated_count + 1;
    RAISE NOTICE '  Converted: % -> %', rec.code, LOWER(rec.code);
  END LOOP;

  RAISE NOTICE 'Converted % UPPERCASE health conditions to lowercase', v_updated_count;
END $$;

-- Step 2: Update carrier_condition_acceptance rules to use lowercase codes
DO $$
DECLARE
  v_baltimore_carrier_id UUID := '5fcc1244-46ed-4b41-bed1-b3e088433bdd';
  v_updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Step 2: Updating Baltimore Life rules to lowercase...';

  UPDATE carrier_condition_acceptance
  SET condition_code = LOWER(condition_code),
      updated_at = NOW()
  WHERE carrier_id = v_baltimore_carrier_id
    AND condition_code ~ '[A-Z]';  -- contains uppercase

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % carrier_condition_acceptance rules to lowercase', v_updated_count;
END $$;

-- Step 3: Delete duplicate UPPERCASE health conditions that now have lowercase equivalents
-- (these are orphaned after step 2)
DO $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 3: Cleaning up duplicate UPPERCASE health conditions...';

  DELETE FROM underwriting_health_conditions
  WHERE code ~ '[A-Z]'  -- contains uppercase
    AND EXISTS (
      SELECT 1 FROM underwriting_health_conditions lc
      WHERE lc.code = LOWER(underwriting_health_conditions.code)
    )
    AND NOT EXISTS (
      -- Only delete if no rules reference it
      SELECT 1 FROM carrier_condition_acceptance
      WHERE condition_code = underwriting_health_conditions.code
    )
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rule_sets
      WHERE condition_code = underwriting_health_conditions.code
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned UPPERCASE health conditions', v_deleted_count;
END $$;

-- Verify the fix
DO $$
DECLARE
  v_uppercase_count INTEGER;
  v_baltimore_carrier_id UUID := '5fcc1244-46ed-4b41-bed1-b3e088433bdd';
BEGIN
  -- Check for any remaining uppercase codes in Baltimore Life rules
  SELECT COUNT(*) INTO v_uppercase_count
  FROM carrier_condition_acceptance
  WHERE carrier_id = v_baltimore_carrier_id
    AND condition_code <> LOWER(condition_code);

  IF v_uppercase_count > 0 THEN
    RAISE WARNING 'Still have % Baltimore Life rules with uppercase codes', v_uppercase_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All Baltimore Life condition codes are now lowercase';
  END IF;

  -- Check for any remaining uppercase health conditions
  SELECT COUNT(*) INTO v_uppercase_count
  FROM underwriting_health_conditions
  WHERE code <> LOWER(code);

  IF v_uppercase_count > 0 THEN
    RAISE WARNING 'Still have % health conditions with uppercase codes', v_uppercase_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All health condition codes are now lowercase';
  END IF;
END $$;

COMMIT;
