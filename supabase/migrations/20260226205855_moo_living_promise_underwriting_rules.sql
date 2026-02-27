-- Migration: MoO Living Promise Part Two Underwriting Rules
-- Creates 21 product-specific rule sets (version=2) for graded benefit conditions.
-- These override carrier-wide v1 decline rules for conditions that Living Promise
-- Part Two covers as graded benefit.
--
-- Carrier: Mutual of Omaha (d619cc12-0a24-4242-9a2d-3dada1fb4b1e)
-- Product: Living Promise (4b5f65d3-d4eb-4c9c-96ab-c3d8654d5378)

BEGIN;

-- =============================================================================
-- Helper: Insert rule set + rule for a graded condition
-- =============================================================================
DO $$
DECLARE
  v_carrier_id  uuid := 'd619cc12-0a24-4242-9a2d-3dada1fb4b1e';
  v_product_id  uuid := '4b5f65d3-d4eb-4c9c-96ab-c3d8654d5378';
  v_imo_id      uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_created_by  uuid := 'd0d3edea-af6d-4990-80b8-1765ba829896';
  v_rs_id       uuid;
  v_condition   record;
BEGIN
  -- 21 Part Two conditions → graded benefit
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'kidney_disease',
      'chronic_kidney_disease',
      'lupus',
      'scleroderma',
      'bipolar',
      'schizophrenia',
      'parkinsons',
      'ms',
      'multiple_sclerosis',
      'heart_attack',
      'coronary_bypass',
      'angioplasty',
      'cardiomyopathy',
      'pacemaker',
      'valve_disorder',
      'stroke',
      'tia',
      'felony_conviction',
      'alcohol_abuse',
      'drug_abuse',
      'mental_facility'
    ]) AS code,
    unnest(ARRAY[
      'Kidney Disease',
      'Chronic Kidney Disease',
      'Lupus/SLE',
      'Scleroderma',
      'Bipolar Disorder',
      'Schizophrenia',
      'Parkinson''s Disease',
      'Multiple Sclerosis (MS)',
      'Multiple Sclerosis',
      'Heart Attack',
      'Coronary Bypass',
      'Angioplasty',
      'Cardiomyopathy',
      'Pacemaker',
      'Heart Valve Disorder',
      'Stroke',
      'TIA (Mini-Stroke)',
      'Felony Conviction',
      'Alcohol Abuse',
      'Drug Abuse',
      'Mental Facility'
    ]) AS label
  LOOP
    -- Insert rule set (skip if already exists via unique index)
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(),
      v_imo_id,
      v_carrier_id,
      v_product_id,
      'condition',
      v_condition.code,
      'default',
      'Living Promise - ' || v_condition.label,
      'Graded benefit for ' || v_condition.label || ' per MoO Living Promise Part Two guidelines',
      true,
      2,
      '{"reason":"No matching rule - manual review required","eligibility":"unknown","healthClass":"unknown","tableRating":"none"}'::jsonb,
      'imported',
      'approved',
      v_created_by
    )
    ON CONFLICT (imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), scope, COALESCE(condition_code, ''::text), variant)
    WHERE is_active = true AND review_status = 'approved'::rule_review_status
    DO NOTHING
    RETURNING id INTO v_rs_id;

    -- If rule set was inserted (not skipped), add the catch-all rule
    IF v_rs_id IS NOT NULL THEN
      INSERT INTO underwriting_rules (
        id, rule_set_id, priority, name,
        predicate, predicate_version,
        outcome_eligibility, outcome_health_class,
        outcome_table_rating, outcome_reason
      ) VALUES (
        gen_random_uuid(),
        v_rs_id,
        1,
        'Default - Graded Benefit',
        '{"version":2,"root":{}}'::jsonb,
        2,
        'eligible',
        'graded',
        'none',
        'Graded benefit per MoO Living Promise Part Two'
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'MoO Living Promise: Inserted % graded rule sets',
    (SELECT count(*) FROM underwriting_rule_sets
     WHERE carrier_id = v_carrier_id
       AND product_id = v_product_id
       AND review_status = 'approved'
       AND is_active = true);
END $$;

COMMIT;
