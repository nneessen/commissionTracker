-- Migration: MoO Living Promise — Complete 62/62 Condition Coverage
--
-- Living Promise is a SIMPLIFIED ISSUE product. The application questions
-- define the entire underwriting:
--   Part One "Yes" → DECLINE (severe/recent conditions)
--   Part Two "Yes" → GRADED (moderate conditions, limited benefit period)
--   All "No"       → STANDARD (full immediate coverage)
--
-- If a condition isn't asked about on the application (e.g., diabetes, COPD,
-- depression), Living Promise genuinely accepts at standard.
--
-- The carrier-wide MoO decline rules were built for underwritten products
-- (Term Life, IULe) and are WRONG for Living Promise. This migration creates
-- product-specific v2 rules for all 62 active conditions so Living Promise
-- has its own complete, correct underwriting that overrides carrier-wide rules.
--
-- Carrier: Mutual of Omaha (d619cc12-0a24-4242-9a2d-3dada1fb4b1e)
-- Product: Living Promise (4b5f65d3-d4eb-4c9c-96ab-c3d8654d5378)

BEGIN;

DO $$
DECLARE
  v_carrier_id  uuid := 'd619cc12-0a24-4242-9a2d-3dada1fb4b1e';
  v_product_id  uuid := '4b5f65d3-d4eb-4c9c-96ab-c3d8654d5378';
  v_imo_id      uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_created_by  uuid := 'd0d3edea-af6d-4990-80b8-1765ba829896';
  v_rs_id       uuid;
  v_condition   record;
BEGIN

  -- =========================================================================
  -- FIX: Pre-existing heart_disease rule set (v1, empty, variant='default')
  -- occupies the unique index slot. Update it to v2 decline + add rule.
  -- =========================================================================
  UPDATE underwriting_rule_sets
  SET version = 2,
      name = 'Living Promise - Heart Disease / Coronary Artery Disease (Decline)',
      description = 'Part One decline for Heart Disease per MoO Living Promise application',
      source = 'imported',
      updated_at = NOW()
  WHERE carrier_id = v_carrier_id
    AND product_id = v_product_id
    AND condition_code = 'heart_disease'
    AND variant = 'default'
    AND is_active = true
    AND review_status = 'approved';

  -- Add decline rule if rule set exists and has no rules
  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name,
    predicate, predicate_version,
    outcome_eligibility, outcome_health_class,
    outcome_table_rating, outcome_reason
  )
  SELECT
    gen_random_uuid(), rs.id, 1, 'Part One - Decline',
    '{"version":2,"root":{}}'::jsonb, 2,
    'ineligible', 'decline', 'none',
    'Decline per MoO Living Promise Part One'
  FROM underwriting_rule_sets rs
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.condition_code = 'heart_disease'
    AND rs.variant = 'default'
    AND rs.is_active = true
    AND rs.review_status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r WHERE r.rule_set_id = rs.id
    );

  -- =========================================================================
  -- PART ONE: DECLINE (4 conditions — heart_disease handled above)
  -- These map directly to Living Promise Part One application questions.
  -- v2 ensures they override any conflicting carrier-wide or product rules.
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'hiv_aids',
      'dementia',
      'cancer',
      'heart_surgery'
    ]) AS code,
    unnest(ARRAY[
      'HIV/AIDS',
      'Dementia / Alzheimer''s',
      'Cancer',
      'Heart Surgery History'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Living Promise - ' || v_condition.label || ' (Decline)',
      'Part One decline for ' || v_condition.label || ' per MoO Living Promise application',
      true, 2,
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
        gen_random_uuid(), v_rs_id, 1, 'Part One - Decline',
        '{"version":2,"root":{}}'::jsonb, 2,
        'ineligible', 'decline', 'none',
        'Decline per MoO Living Promise Part One'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- PART TWO: GRADED (1 condition)
  -- severe_mental_illness maps to schizophrenia (Part Two).
  -- The other Part Two conditions already have v2 graded from prior migration.
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'severe_mental_illness'
    ]) AS code,
    unnest(ARRAY[
      'Schizophrenia / Psychotic Disorder'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Living Promise - ' || v_condition.label || ' (Graded)',
      'Graded benefit for ' || v_condition.label || ' per MoO Living Promise Part Two',
      true, 2,
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
        gen_random_uuid(), v_rs_id, 1, 'Part Two - Graded Benefit',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'graded', 'none',
        'Graded benefit per MoO Living Promise Part Two'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- PART THREE: STANDARD (39 conditions)
  -- These conditions are NOT asked about on the Living Promise application.
  -- If a simplified-issue app doesn't ask, the carrier accepts at standard.
  -- v2 overrides any carrier-wide declines that were meant for underwritten
  -- products (Term Life, IULe), not simplified issue.
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      -- Common conditions LP doesn't ask about
      'adhd',
      'afib',
      'anemia',
      'aneurysm',
      'anxiety',
      'asthma',
      'back_problems',
      'blood_clots',
      'chronic_lung_disease',
      'congestive_heart_failure',
      'copd',
      'crohns',
      'depression',
      'diabetes',
      'diverticulitis',
      'eating_disorder',
      'epilepsy',
      'fibromyalgia',
      'gallbladder_disorders',
      'gastritis',
      'heart_murmur',
      'high_blood_pressure',
      'high_cholesterol',
      'ibs',
      'kidney_stones',
      'liver_disease',
      'migraines',
      'narcolepsy',
      'neuropathy',
      'opioid_usage',
      'osteoarthritis',
      'pancreatitis',
      'paralysis',
      'peripheral_vascular',
      'pkd',
      'psoriasis',
      'ptsd',
      'rheumatoid_arthritis',
      'sleep_apnea',
      'thyroid_disorder',
      'tobacco_use',
      'ulcerative_colitis',
      'vascular_surgery'
    ]) AS code,
    unnest(ARRAY[
      'ADD/ADHD',
      'Atrial Fibrillation',
      'Anemia',
      'Aneurysm',
      'Anxiety Disorder',
      'Asthma',
      'Back/Spine Problems',
      'Blood Clots (DVT/PE)',
      'Chronic Lung Disease',
      'Congestive Heart Failure',
      'COPD/Emphysema',
      'Crohn''s Disease',
      'Depression',
      'Diabetes',
      'Diverticulitis',
      'Eating Disorder',
      'Epilepsy/Seizures',
      'Fibromyalgia',
      'Gallbladder Disorders',
      'GERD/Gastritis',
      'Heart Murmur',
      'High Blood Pressure',
      'High Cholesterol',
      'Irritable Bowel Syndrome',
      'Kidney Stones',
      'Liver Disease',
      'Migraines',
      'Narcolepsy',
      'Peripheral Neuropathy',
      'Chronic Opioid Use',
      'Osteoarthritis',
      'Pancreatitis',
      'Paralysis',
      'Peripheral Vascular Disease',
      'Polycystic Kidney Disease',
      'Psoriasis',
      'PTSD',
      'Rheumatoid Arthritis',
      'Sleep Apnea',
      'Thyroid Disorder',
      'Tobacco Use',
      'Ulcerative Colitis',
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
      'Living Promise - ' || v_condition.label || ' (Standard)',
      'Standard/full benefit — ' || v_condition.label || ' not asked on LP simplified issue application',
      true, 2,
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
        gen_random_uuid(), v_rs_id, 1, 'Part Three - Standard/Full Benefit',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'standard', 'none',
        'Standard benefit — condition not asked on Living Promise simplified issue application'
      );
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE 'Living Promise complete coverage: % total product-specific rule sets',
    (SELECT count(*) FROM underwriting_rule_sets
     WHERE carrier_id = v_carrier_id
       AND product_id = v_product_id
       AND review_status = 'approved'
       AND is_active = true);
END $$;

COMMIT;
