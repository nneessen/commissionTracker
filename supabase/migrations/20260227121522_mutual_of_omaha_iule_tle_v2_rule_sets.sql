-- Mutual of Omaha IULE + TLE v2 underwriting rule sets
-- Creates rule_sets + rules for all conditions from the IULE/TLE application
-- Products:
--   IULE (IULe): 3c227f86-4f5c-4c37-ac07-e8fa28c451c5 (indexed_universal_life)
--   TLE (Term Life Express): 1acbbee5-3cd4-4d47-9f2f-eb05d09f0023 (term_life)
-- Carrier: d619cc12-0a24-4242-9a2d-3dada1fb4b1e (Mutual of Omaha)
--
-- Application: Questions 2-7 "Yes" = NOT ELIGIBLE
-- Question 1: HIV/AIDS = DECLINE
-- Question 8: Diabetes nuanced (8a = case_by_case, 8b/8c = decline) — already exists as product-specific rule set
-- Questions 9-10: case_by_case (catch-all)

DO $$
DECLARE
  v_carrier_id uuid := 'd619cc12-0a24-4242-9a2d-3dada1fb4b1e';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_iule_id uuid := '3c227f86-4f5c-4c37-ac07-e8fa28c451c5';
  v_tle_id uuid := '1acbbee5-3cd4-4d47-9f2f-eb05d09f0023';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_rs_id uuid;
  v_count int := 0;
BEGIN

  -- =====================================================================
  -- Helper: For each condition, create a rule_set + 1 decline rule
  -- for BOTH IULE and TLE products
  -- =====================================================================

  -- We'll use a simple pattern: iterate through conditions using a temporary table
  CREATE TEMP TABLE _iule_tle_conditions (
    code text,
    display_name text,
    question_ref text,
    outcome_elig text DEFAULT 'ineligible',
    outcome_class text DEFAULT 'decline',
    outcome_reason_suffix text DEFAULT 'NOT ELIGIBLE'
  ) ON COMMIT DROP;

  -- ========================================
  -- Q1: HIV/AIDS → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('hiv_aids', 'HIV/AIDS', 'Q1'),
    ('aids', 'AIDS', 'Q1'),
    ('hiv_positive', 'HIV Positive', 'Q1'),
    ('arc', 'AIDS Related Complex (ARC)', 'Q1');

  -- ========================================
  -- Q2a: Cardiac → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('heart_disease', 'Coronary Artery Disease', 'Q2a'),
    ('heart_attack', 'Heart Attack', 'Q2a'),
    ('coronary_bypass', 'Coronary Artery Bypass Surgery', 'Q2a'),
    ('angioplasty', 'Angioplasty', 'Q2a'),
    ('cardiac_stent', 'Stent Placement', 'Q2a'),
    ('valve_disorder', 'Valvular Heart Disease', 'Q2a'),
    ('heart_valve_replacement', 'Heart Valve Replacement', 'Q2a'),
    ('cardiomyopathy', 'Cardiomyopathy', 'Q2a'),
    ('congestive_heart_failure', 'Congestive Heart Failure', 'Q2a'),
    ('pacemaker', 'Pacemaker', 'Q2a'),
    ('defibrillator', 'Defibrillator (ICD)', 'Q2a'),
    ('stroke', 'Stroke', 'Q2a'),
    ('tia', 'Transient Ischemic Attack (TIA)', 'Q2a'),
    ('afib', 'Abnormal Heart Rhythm (AFib)', 'Q2a'),
    ('aneurysm', 'Aneurysm (Cerebral/Aortic/Thoracic)', 'Q2a'),
    ('aaa', 'Abdominal Aortic Aneurysm', 'Q2a'),
    ('heart_surgery', 'Heart Surgery', 'Q2a'),
    ('angina', 'Angina', 'Q2a');

  -- ========================================
  -- Q2b: Chronic Lung → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('copd', 'COPD/Emphysema', 'Q2b'),
    ('chronic_bronchitis', 'Chronic Bronchitis', 'Q2b'),
    ('emphysema', 'Emphysema', 'Q2b'),
    ('chronic_lung_disease', 'Chronic Lung Disease/Sarcoidosis/Pulmonary Fibrosis', 'Q2b'),
    ('cystic_fibrosis', 'Cystic Fibrosis', 'Q2b'),
    ('lung_disease', 'Lung Disease', 'Q2b');

  -- ========================================
  -- Q2c: Neurological/Mental → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('bipolar', 'Bipolar Depression', 'Q2c'),
    ('schizophrenia', 'Schizophrenia', 'Q2c'),
    ('severe_mental_illness', 'Psychotic Disorder', 'Q2c'),
    ('alzheimers', 'Alzheimer''s Disease', 'Q2c'),
    ('dementia', 'Dementia', 'Q2c'),
    ('parkinsons', 'Parkinson''s Disease', 'Q2c'),
    ('als', 'ALS (Lou Gehrig''s Disease)', 'Q2c'),
    ('muscular_dystrophy', 'Muscular Dystrophy', 'Q2c'),
    ('ms', 'Multiple Sclerosis', 'Q2c'),
    ('multiple_sclerosis', 'Multiple Sclerosis', 'Q2c'),
    ('paralysis', 'Quadriplegia/Paraplegia', 'Q2c'),
    ('cerebral_palsy', 'Cerebral Palsy', 'Q2c');

  -- ========================================
  -- Q2d: Kidney/Liver → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('chronic_kidney_disease', 'Chronic Kidney Disease', 'Q2d'),
    ('kidney_disease', 'Kidney Disease', 'Q2d'),
    ('kidney_dialysis', 'End-Stage Renal Disease / Dialysis', 'Q2d'),
    ('kidney_failure', 'Kidney Failure', 'Q2d'),
    ('pancreatitis', 'Chronic Pancreatitis', 'Q2d'),
    ('liver_disease', 'Liver Disease', 'Q2d'),
    ('cirrhosis', 'Cirrhosis', 'Q2d'),
    ('liver_failure', 'Liver Failure', 'Q2d'),
    ('hepatitis_c', 'Hepatitis B or C', 'Q2d');

  -- ========================================
  -- Q2e: Cancer → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('cancer', 'Cancer (any type)', 'Q2e'),
    ('cancer_active', 'Cancer - Active Treatment', 'Q2e'),
    ('cancer_metastatic', 'Cancer - Metastatic', 'Q2e'),
    ('cancer_recurrence', 'Cancer - Recurrence', 'Q2e'),
    ('leukemia', 'Leukemia', 'Q2e'),
    ('melanoma', 'Melanoma', 'Q2e'),
    ('lymphoma', 'Lymphoma', 'Q2e'),
    ('internal_cancer', 'Internal Cancer', 'Q2e'),
    ('hodgkins_disease', 'Hodgkin''s Disease', 'Q2e');

  -- ========================================
  -- Q2f: Autoimmune → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('lupus', 'Systemic Lupus', 'Q2f'),
    ('sle_lupus', 'Systemic Lupus (SLE)', 'Q2f'),
    ('scleroderma', 'Scleroderma', 'Q2f');

  -- ========================================
  -- Q2g: Organ Transplant → DECLINE
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('organ_transplant', 'Organ Transplant', 'Q2g'),
    ('transplant_advised', 'Organ Transplant - Medically Advised', 'Q2g');

  -- ========================================
  -- Q3: ADL/Facility/Device → DECLINE (past 12 months)
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('adl_impairment', 'ADL Assistance Required', 'Q3a'),
    ('nursing_facility', 'Nursing/Assisted Living Facility', 'Q3b'),
    ('hospice_care', 'Hospice Care', 'Q3b'),
    ('oxygen_required', 'Oxygen Required', 'Q3c'),
    ('bed_confinement', 'Walker/Wheelchair/Scooter/Catheter', 'Q3c');

  -- ========================================
  -- Q4: Pending/Unexplained → DECLINE (past 12 months)
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('pending_diagnostics', 'Pending Surgery/Diagnostic Testing', 'Q4a'),
    ('terminal_condition', 'Unexplained Weight Loss/Chronic Cough/Fatigue/GI Bleeding', 'Q4b');

  -- ========================================
  -- Q6: Substance/Criminal → DECLINE (past 10 years)
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('alcohol_abuse', 'Alcohol Abuse/Treatment', 'Q6a'),
    ('drug_abuse', 'Drug Abuse/Unlawful Drug Use', 'Q6b'),
    ('opioid_usage', 'Chronic Opioid/Pain Medication Use', 'Q6b'),
    ('felony_conviction', 'Felony Conviction/Awaiting Trial', 'Q6c');

  -- ========================================
  -- Q7: DUI/Hospitalization → DECLINE (past 5 years)
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('dui_dwi', 'DUI/DWI/Reckless Driving', 'Q7a'),
    ('mental_facility', 'Hospitalized for HBP or Mental/Nervous Disorder', 'Q7b');

  -- ========================================
  -- Q8: Diabetes complications → DECLINE
  -- (diabetes itself already has product-specific rule sets)
  -- ========================================
  INSERT INTO _iule_tle_conditions (code, display_name, question_ref) VALUES
    ('diabetes_juvenile', 'Diabetes Before Age 45', 'Q8b'),
    ('diabetes_insulin_early', 'Diabetes - Insulin Before Age 40', 'Q8b'),
    ('diabetic_retinopathy', 'Diabetic Retinopathy', 'Q8c'),
    ('diabetic_neuropathy', 'Diabetic Neuropathy', 'Q8c'),
    ('diabetes_amputation', 'Diabetes with Amputation', 'Q8c'),
    ('pad', 'Peripheral Arterial Disease (PAD)', 'Q8c'),
    ('peripheral_vascular', 'Peripheral Vascular Disease', 'Q8c'),
    ('diabetes_uncontrolled', 'Uncontrolled Diabetes', 'Q8c'),
    ('diabetic_coma', 'Diabetic Coma', 'Q8c'),
    ('insulin_shock', 'Insulin Shock', 'Q8c');

  -- =====================================================================
  -- Now loop through all conditions and create rule_sets + rules
  -- for BOTH products
  -- =====================================================================

  -- Insert IULE rule sets
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, is_active, version, default_outcome, source, review_status, source_type, needs_review
  )
  SELECT
    gen_random_uuid(),
    v_imo_id,
    v_carrier_id,
    v_iule_id,
    'condition'::rule_set_scope,
    c.code,
    'default',
    'MoO IULe - ' || c.display_name,
    c.question_ref || ': ' || c.display_name || ' = ' || c.outcome_reason_suffix,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _iule_tle_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_iule_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'IULE: inserted % rule sets', v_count;

  -- Insert TLE rule sets
  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, is_active, version, default_outcome, source, review_status, source_type, needs_review
  )
  SELECT
    gen_random_uuid(),
    v_imo_id,
    v_carrier_id,
    v_tle_id,
    'condition'::rule_set_scope,
    c.code,
    'default',
    'MoO TLE - ' || c.display_name,
    c.question_ref || ': ' || c.display_name || ' = ' || c.outcome_reason_suffix,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _iule_tle_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_tle_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'TLE: inserted % rule sets', v_count;

  -- =====================================================================
  -- Now insert the actual rules (one decline rule per rule_set)
  -- =====================================================================

  -- IULE rules
  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Decline',
    jsonb_build_object(
      'version', 2,
      'root', jsonb_build_object(
        'type', 'condition_presence',
        'field', 'conditions',
        'operator', 'includes_any',
        'value', jsonb_build_array(c.code)
      )
    ),
    2,
    c.outcome_elig,
    c.outcome_class::health_class,
    c.question_ref || ': ' || c.display_name || ' = ' || c.outcome_reason_suffix
  FROM underwriting_rule_sets rs
  JOIN _iule_tle_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_iule_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'IULE: inserted % rules', v_count;

  -- TLE rules
  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Decline',
    jsonb_build_object(
      'version', 2,
      'root', jsonb_build_object(
        'type', 'condition_presence',
        'field', 'conditions',
        'operator', 'includes_any',
        'value', jsonb_build_array(c.code)
      )
    ),
    2,
    c.outcome_elig,
    c.outcome_class::health_class,
    c.question_ref || ': ' || c.display_name || ' = ' || c.outcome_reason_suffix
  FROM underwriting_rule_sets rs
  JOIN _iule_tle_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_tle_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'TLE: inserted % rules', v_count;

END $$;
