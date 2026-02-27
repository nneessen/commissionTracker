-- Migration: ELCO Silver Eagle — Complete 62/62 Condition Coverage
--
-- Silver Eagle is a 5-tier SIMPLIFIED ISSUE product. Application questions
-- define the entire underwriting:
--   Part A "Yes" → GUARANTEED ISSUE (worst tier)
--   Part B "Yes" → MODIFIED
--   Part C "Yes" → GRADED
--   Part D "Yes" → STANDARD
--   Part E "Yes" → STANDARD PLUS
--   All "No"     → PREFERRED (best tier)
--
-- The prior migration created 69 rule sets using condition codes from the SE
-- application (e.g., cancer_multiple, liver_failure, cardiac_stent). But the
-- active condition picker uses different codes (e.g., cancer, liver_disease,
-- valve_disorder). This migration fills the 35 remaining active picker conditions.
--
-- For conditions not asked about on the SE application → PREFERRED (best tier).
-- For conditions that map to SE questions under a different code → correct tier.
--
-- Carrier: ELCO Mutual (a04c25c3-edd8-404a-91d8-cd39e5faf2e8)
-- Product: Silver Eagle (d420b56f-0193-47f1-b86e-26f9e2b80c15)

BEGIN;

DO $$
DECLARE
  v_carrier_id  uuid := 'a04c25c3-edd8-404a-91d8-cd39e5faf2e8';
  v_product_id  uuid := 'd420b56f-0193-47f1-b86e-26f9e2b80c15';
  v_imo_id      uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_created_by  uuid := 'd0d3edea-af6d-4990-80b8-1765ba829896';
  v_rs_id       uuid;
  v_condition   record;
BEGIN

  -- =========================================================================
  -- GRADED (Part C equivalent) — 1 condition
  -- valve_disorder maps to SE Part C heart conditions (pacemaker, heart_surgery, etc.)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY['valve_disorder']) AS code,
           unnest(ARRAY['Heart Valve Disorder']) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label || ' (Graded)',
      'Graded benefit for ' || v_condition.label || ' — maps to SE Part C heart conditions',
      true, 1,
      '{"reason":"No matching rule - manual review required","eligibility":"unknown","healthClass":"unknown","tableRating":"none"}'::jsonb,
      'imported', 'approved', v_created_by
    )
    ON CONFLICT (imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), scope, COALESCE(condition_code, ''::text), variant)
    WHERE is_active = true AND review_status = 'approved'::rule_review_status
    DO NOTHING
    RETURNING id INTO v_rs_id;

    IF v_rs_id IS NOT NULL THEN
      INSERT INTO underwriting_rules (
        id, rule_set_id, priority, name,
        predicate, predicate_version,
        outcome_eligibility, outcome_health_class,
        outcome_table_rating, outcome_reason
      ) VALUES (
        gen_random_uuid(), v_rs_id, 1, 'Part C - Graded Benefit',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'graded', 'none',
        'Graded benefit — maps to Silver Eagle Part C heart conditions'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- STANDARD (Part D equivalent) — 2 conditions
  -- Generic cancer/liver_disease map to less severe SE Part D scenarios.
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY['cancer', 'liver_disease']) AS code,
           unnest(ARRAY['Cancer (any type)', 'Liver Disease']) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label || ' (Standard)',
      'Standard class for ' || v_condition.label || ' — generic condition maps to SE Part D',
      true, 1,
      '{"reason":"No matching rule - manual review required","eligibility":"unknown","healthClass":"unknown","tableRating":"none"}'::jsonb,
      'imported', 'approved', v_created_by
    )
    ON CONFLICT (imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), scope, COALESCE(condition_code, ''::text), variant)
    WHERE is_active = true AND review_status = 'approved'::rule_review_status
    DO NOTHING
    RETURNING id INTO v_rs_id;

    IF v_rs_id IS NOT NULL THEN
      INSERT INTO underwriting_rules (
        id, rule_set_id, priority, name,
        predicate, predicate_version,
        outcome_eligibility, outcome_health_class,
        outcome_table_rating, outcome_reason
      ) VALUES (
        gen_random_uuid(), v_rs_id, 1, 'Part D - Standard',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'standard', 'none',
        'Standard class — generic condition maps to Silver Eagle Part D'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- PREFERRED (not asked about) — 32 conditions
  -- These conditions are NOT on the Silver Eagle application.
  -- Simplified issue: if the app doesn't ask, the carrier accepts at best tier.
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'adhd',
      'anemia',
      'anxiety',
      'asthma',
      'back_problems',
      'blood_clots',
      'depression',
      'diverticulitis',
      'eating_disorder',
      'fibromyalgia',
      'gallbladder_disorders',
      'gastritis',
      'heart_murmur',
      'high_blood_pressure',
      'high_cholesterol',
      'ibs',
      'kidney_stones',
      'medication_exclusion',
      'migraines',
      'narcolepsy',
      'opioid_usage',
      'osteoarthritis',
      'pkd',
      'psoriasis',
      'ptsd',
      'rheumatoid_arthritis',
      'scleroderma',
      'severe_mental_illness',
      'sleep_apnea',
      'thyroid_disorder',
      'tobacco_use',
      'vascular_surgery'
    ]) AS code,
    unnest(ARRAY[
      'ADD/ADHD',
      'Anemia',
      'Anxiety Disorder',
      'Asthma',
      'Back/Spine Problems',
      'Blood Clots (DVT/PE)',
      'Depression',
      'Diverticulitis',
      'Eating Disorder',
      'Fibromyalgia',
      'Gallbladder Disorders',
      'GERD/Gastritis',
      'Heart Murmur',
      'High Blood Pressure',
      'High Cholesterol',
      'Irritable Bowel Syndrome',
      'Kidney Stones',
      'Prescription Medication Exclusion',
      'Migraines',
      'Narcolepsy',
      'Chronic Opioid Use',
      'Osteoarthritis',
      'Polycystic Kidney Disease',
      'Psoriasis',
      'PTSD',
      'Rheumatoid Arthritis',
      'Scleroderma',
      'Schizophrenia / Psychotic Disorder',
      'Sleep Apnea',
      'Thyroid Disorder',
      'Tobacco Use',
      'Vascular Surgery'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label || ' (Preferred)',
      'Preferred — ' || v_condition.label || ' not asked on SE simplified issue application',
      true, 1,
      '{"reason":"No matching rule - manual review required","eligibility":"unknown","healthClass":"unknown","tableRating":"none"}'::jsonb,
      'imported', 'approved', v_created_by
    )
    ON CONFLICT (imo_id, carrier_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), scope, COALESCE(condition_code, ''::text), variant)
    WHERE is_active = true AND review_status = 'approved'::rule_review_status
    DO NOTHING
    RETURNING id INTO v_rs_id;

    IF v_rs_id IS NOT NULL THEN
      INSERT INTO underwriting_rules (
        id, rule_set_id, priority, name,
        predicate, predicate_version,
        outcome_eligibility, outcome_health_class,
        outcome_table_rating, outcome_reason
      ) VALUES (
        gen_random_uuid(), v_rs_id, 1, 'Not Asked - Preferred',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'preferred', 'none',
        'Preferred — condition not asked on Silver Eagle simplified issue application'
      );
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE 'Silver Eagle complete coverage: % total product-specific rule sets',
    (SELECT count(*) FROM underwriting_rule_sets
     WHERE carrier_id = v_carrier_id
       AND product_id = v_product_id
       AND review_status = 'approved'
       AND is_active = true);
END $$;

COMMIT;
