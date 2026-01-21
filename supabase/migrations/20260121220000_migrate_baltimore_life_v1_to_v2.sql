-- supabase/migrations/20260121220000_migrate_baltimore_life_v1_to_v2.sql
-- Migrate Baltimore Life rules from V1 (carrier_condition_acceptance) to V2 (underwriting_rule_sets/rules)
--
-- CRITICAL BUG: The decision engine (calculateApprovalV2) only queries V2 tables.
-- Baltimore Life has 87 V1 rules that are NOT BEING EVALUATED.
-- This migration converts them to V2 format.

BEGIN;

DO $$
DECLARE
  v_baltimore_carrier_id UUID := '5fcc1244-46ed-4b41-bed1-b3e088433bdd';
  v_imo_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_rule_set_id UUID;
  v_migrated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_outcome_eligibility TEXT;
  v_outcome_health_class TEXT;
  rec RECORD;
BEGIN
  RAISE NOTICE 'Starting Baltimore Life V1 → V2 migration...';

  -- Iterate through all Baltimore Life V1 rules
  FOR rec IN
    SELECT
      cca.id as v1_id,
      cca.condition_code,
      cca.acceptance,
      cca.health_class_result,
      cca.notes,
      cca.product_type,
      cca.approval_likelihood
    FROM carrier_condition_acceptance cca
    WHERE cca.carrier_id = v_baltimore_carrier_id
      AND cca.imo_id = v_imo_id
    ORDER BY cca.condition_code
  LOOP
    -- Check if V2 rule set already exists for this condition
    IF EXISTS (
      SELECT 1 FROM underwriting_rule_sets
      WHERE carrier_id = v_baltimore_carrier_id
        AND condition_code = rec.condition_code
        AND imo_id = v_imo_id
        AND is_active = true
    ) THEN
      RAISE NOTICE '  SKIP: % - V2 rule set already exists', rec.condition_code;
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Map V1 acceptance to V2 outcome
    CASE rec.acceptance
      WHEN 'declined' THEN
        v_outcome_eligibility := 'ineligible';
        v_outcome_health_class := 'decline';
      WHEN 'table_rated' THEN
        v_outcome_eligibility := 'eligible';
        v_outcome_health_class := COALESCE(rec.health_class_result, 'substandard');
      WHEN 'approved' THEN
        v_outcome_eligibility := 'eligible';
        v_outcome_health_class := COALESCE(rec.health_class_result, 'standard');
      WHEN 'case_by_case' THEN
        v_outcome_eligibility := 'refer';
        v_outcome_health_class := 'refer';
      ELSE
        v_outcome_eligibility := 'refer';
        v_outcome_health_class := 'refer';
    END CASE;

    -- Create V2 rule set
    v_rule_set_id := gen_random_uuid();

    INSERT INTO underwriting_rule_sets (
      id,
      imo_id,
      carrier_id,
      product_id,
      scope,
      condition_code,
      variant,
      name,
      description,
      source,
      review_status,
      is_active,
      version,
      created_at,
      updated_at
    ) VALUES (
      v_rule_set_id,
      v_imo_id,
      v_baltimore_carrier_id,
      NULL, -- carrier-wide
      'condition',
      rec.condition_code,
      'default',
      'Baltimore Life - ' || INITCAP(REPLACE(rec.condition_code, '_', ' ')),
      COALESCE(rec.notes, 'Migrated from V1 carrier_condition_acceptance'),
      'imported',
      'approved',
      true,
      1,
      NOW(),
      NOW()
    );

    -- Create V2 rule with empty predicate (matches when condition is present)
    INSERT INTO underwriting_rules (
      id,
      rule_set_id,
      priority,
      name,
      description,
      predicate,
      predicate_version,
      outcome_eligibility,
      outcome_health_class,
      outcome_table_rating,
      outcome_reason,
      outcome_concerns,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_rule_set_id,
      10,
      INITCAP(REPLACE(rec.condition_code, '_', ' ')) || ' - ' || INITCAP(rec.acceptance),
      COALESCE(rec.notes, 'Condition presence check'),
      '{"version": 2, "root": {}}'::jsonb,
      2,
      v_outcome_eligibility,
      v_outcome_health_class::health_class,
      'none'::table_rating,
      COALESCE(rec.notes, rec.condition_code || ' - ' || rec.acceptance),
      ARRAY[]::text[],
      NOW(),
      NOW()
    );

    v_migrated_count := v_migrated_count + 1;
    RAISE NOTICE '  MIGRATED: % → % (%)', rec.condition_code, v_outcome_eligibility, v_outcome_health_class;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Migrated: % rules', v_migrated_count;
  RAISE NOTICE 'Skipped (already in V2): % rules', v_skipped_count;
  RAISE NOTICE 'Total V1 rules processed: %', v_migrated_count + v_skipped_count;

  -- Verify final counts
  RAISE NOTICE '';
  RAISE NOTICE '=== Verification ===';

  SELECT COUNT(*) INTO v_migrated_count
  FROM underwriting_rule_sets
  WHERE carrier_id = v_baltimore_carrier_id
    AND imo_id = v_imo_id
    AND is_active = true;
  RAISE NOTICE 'Baltimore Life V2 rule sets (active): %', v_migrated_count;

  SELECT COUNT(*) INTO v_skipped_count
  FROM carrier_condition_acceptance
  WHERE carrier_id = v_baltimore_carrier_id
    AND imo_id = v_imo_id;
  RAISE NOTICE 'Baltimore Life V1 rules (for reference): %', v_skipped_count;

END $$;

COMMIT;
