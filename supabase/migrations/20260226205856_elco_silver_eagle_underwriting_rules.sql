-- Migration: ELCO Silver Eagle Full 5-Tier Underwriting Rules
-- Creates 69 product-specific rule sets (version=1) across 5 health class tiers:
--   Part A: Guaranteed Issue (28 conditions)
--   Part B: Modified (1 condition)
--   Part C: Graded (10 conditions)
--   Part D: Standard (28 conditions)
--   Part E: Standard Plus (2 conditions)
-- Default (no conditions): Preferred (handled by engine's healthy-client shortcut)
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
  -- Part A: Guaranteed Issue (28 conditions)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'adl_impairment', 'oxygen_required', 'paralysis', 'hospitalization_extended',
      'bed_confinement', 'hospice_care', 'nursing_facility', 'terminal_condition',
      'hiv_aids', 'aids', 'hiv_positive', 'alzheimers', 'dementia', 'als',
      'mental_incapacity', 'muscular_dystrophy', 'cystic_fibrosis', 'liver_failure',
      'cirrhosis', 'congestive_heart_failure', 'cardiomyopathy', 'kidney_failure',
      'kidney_dialysis', 'cancer_multiple', 'cancer_metastatic', 'cancer_recurrence',
      'organ_transplant', 'chronic_lung_disease'
    ]) AS code,
    unnest(ARRAY[
      'ADL Impairment', 'Oxygen Required', 'Paralysis', 'Extended Hospitalization',
      'Bed Confinement', 'Hospice Care', 'Nursing Facility', 'Terminal Condition',
      'HIV/AIDS', 'AIDS', 'HIV Positive', 'Alzheimer''s', 'Dementia', 'ALS',
      'Mental Incapacity', 'Muscular Dystrophy', 'Cystic Fibrosis', 'Liver Failure',
      'Cirrhosis', 'Congestive Heart Failure', 'Cardiomyopathy', 'Kidney Failure',
      'Kidney Dialysis', 'Multiple Cancers', 'Metastatic Cancer', 'Cancer Recurrence',
      'Organ Transplant', 'Chronic Lung Disease'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label,
      'Guaranteed issue for ' || v_condition.label || ' per ELCO Silver Eagle Part A',
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
        gen_random_uuid(), v_rs_id, 1, 'Default - Guaranteed Issue',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'guaranteed_issue', 'none',
        'Guaranteed issue per ELCO Silver Eagle Part A'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- Part B: Modified (1 condition)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY['pending_diagnostics']) AS code,
           unnest(ARRAY['Pending Diagnostics']) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label,
      'Modified benefit for ' || v_condition.label || ' per ELCO Silver Eagle Part B',
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
        gen_random_uuid(), v_rs_id, 1, 'Default - Modified Benefit',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'modified', 'none',
        'Modified benefit per ELCO Silver Eagle Part B'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- Part C: Graded (10 conditions)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'parkinsons', 'lupus', 'angina', 'heart_disease', 'heart_surgery',
      'coronary_bypass', 'angioplasty', 'cardiac_stent', 'aneurysm', 'pacemaker'
    ]) AS code,
    unnest(ARRAY[
      'Parkinson''s Disease', 'Lupus/SLE', 'Angina', 'Heart Disease', 'Heart Surgery',
      'Coronary Bypass', 'Angioplasty', 'Cardiac Stent', 'Aneurysm', 'Pacemaker'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label,
      'Graded benefit for ' || v_condition.label || ' per ELCO Silver Eagle Part C',
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
        gen_random_uuid(), v_rs_id, 1, 'Default - Graded Benefit',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'graded', 'none',
        'Graded benefit per ELCO Silver Eagle Part C'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- Part D: Standard (28 conditions)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY[
      'epilepsy', 'diabetes', 'crohns', 'ulcerative_colitis', 'bipolar',
      'copd', 'emphysema', 'chronic_bronchitis', 'diabetes_juvenile',
      'mental_facility', 'cancer_active', 'afib', 'tia', 'pancreatitis',
      'kidney_disease', 'chronic_kidney_disease', 'hepatitis_c', 'ms',
      'multiple_sclerosis', 'stroke', 'heart_attack', 'defibrillator',
      'diabetic_neuropathy', 'diabetic_retinopathy', 'alcohol_abuse',
      'drug_abuse', 'felony_conviction', 'dui_dwi'
    ]) AS code,
    unnest(ARRAY[
      'Epilepsy', 'Diabetes', 'Crohn''s Disease', 'Ulcerative Colitis', 'Bipolar Disorder',
      'COPD', 'Emphysema', 'Chronic Bronchitis', 'Juvenile Diabetes',
      'Mental Facility', 'Active Cancer', 'Atrial Fibrillation', 'TIA (Mini-Stroke)', 'Pancreatitis',
      'Kidney Disease', 'Chronic Kidney Disease', 'Hepatitis C', 'Multiple Sclerosis (MS)',
      'Multiple Sclerosis', 'Stroke', 'Heart Attack', 'Defibrillator',
      'Diabetic Neuropathy', 'Diabetic Retinopathy', 'Alcohol Abuse',
      'Drug Abuse', 'Felony Conviction', 'DUI/DWI'
    ]) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label,
      'Standard class for ' || v_condition.label || ' per ELCO Silver Eagle Part D',
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
        gen_random_uuid(), v_rs_id, 1, 'Default - Standard',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'standard', 'none',
        'Standard class per ELCO Silver Eagle Part D'
      );
    END IF;
  END LOOP;

  -- =========================================================================
  -- Part E: Standard Plus (2 conditions)
  -- =========================================================================
  FOR v_condition IN
    SELECT unnest(ARRAY['peripheral_vascular', 'neuropathy']) AS code,
           unnest(ARRAY['Peripheral Vascular Disease', 'Neuropathy']) AS label
  LOOP
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant,
      name, description, is_active, version, default_outcome,
      source, review_status, created_by
    ) VALUES (
      gen_random_uuid(), v_imo_id, v_carrier_id, v_product_id,
      'condition', v_condition.code, 'default',
      'Silver Eagle - ' || v_condition.label,
      'Standard Plus class for ' || v_condition.label || ' per ELCO Silver Eagle Part E',
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
        gen_random_uuid(), v_rs_id, 1, 'Default - Standard Plus',
        '{"version":2,"root":{}}'::jsonb, 2,
        'eligible', 'standard_plus', 'none',
        'Standard Plus class per ELCO Silver Eagle Part E'
      );
    END IF;
  END LOOP;

  -- Summary
  RAISE NOTICE 'ELCO Silver Eagle: Inserted % rule sets',
    (SELECT count(*) FROM underwriting_rule_sets
     WHERE carrier_id = v_carrier_id
       AND product_id = v_product_id
       AND review_status = 'approved'
       AND is_active = true);
END $$;

COMMIT;
