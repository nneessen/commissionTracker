-- Foresters Financial acceptance rules
-- Carrier: Foresters Financial (acca122f-4261-46d9-9287-da47b8ba5e37)
-- Products:
--   Strong Foundation (544bb4d4-20aa-4b1a-b77d-3b95c3eaa98f) - term_life
--   Your Term (73c35990-7da1-479b-b1fa-492b0ffb6b40) - term_life
--   Advantage Plus II (cd70f38e-0e9f-492d-8ac3-02294b24df8e) - participating_whole_life
--
-- Source: Foresters Financial Impairment Guide
-- Most conditions shared across all 3 products.
-- Product-specific differences:
--   COPD: Strong Foundation=case_by_case (mild, non-smoker), others=declined
--   Diabetes Type 1/insulin: Strong Foundation=case_by_case (age-restricted), others=declined
-- V1 uses conservative (declined) for shared product_type; V2 differentiates per product_id.

DO $$
DECLARE
  v_carrier_id uuid := 'acca122f-4261-46d9-9287-da47b8ba5e37';
  v_strong_id  uuid := '544bb4d4-20aa-4b1a-b77d-3b95c3eaa98f';
  v_yourterm_id uuid := '73c35990-7da1-479b-b1fa-492b0ffb6b40';
  v_advplus_id uuid := 'cd70f38e-0e9f-492d-8ac3-02294b24df8e';
  v_imo_id     uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
  v_pid   uuid;
  v_ptype text;
  v_pname text;
BEGIN

  CREATE TEMP TABLE _ff_conditions (
    code text,
    display_name text,
    acceptance text,
    approval_likelihood numeric,
    notes text,
    outcome_elig text,
    outcome_class text
  ) ON COMMIT DROP;

  INSERT INTO _ff_conditions (code, display_name, acceptance, approval_likelihood, notes, outcome_elig, outcome_class) VALUES
    -- ═══ DECLINE conditions (all 3 products) ═══
    -- Cardiac / Vascular
    ('congestive_heart_failure', 'CHF', 'declined', 0, 'Decline: Congestive Heart Failure', 'ineligible', 'decline'),
    ('heart_disease', 'Heart Disease/CAD', 'declined', 0, 'Decline: Heart disease, CAD, artery blockage', 'ineligible', 'decline'),
    ('heart_attack', 'Heart Attack/MI', 'declined', 0, 'Decline: Heart attack / myocardial infarction', 'ineligible', 'decline'),
    ('angina', 'Angina', 'declined', 0, 'Decline: Angina', 'ineligible', 'decline'),
    ('angioplasty', 'Angioplasty', 'declined', 0, 'Decline: Angioplasty', 'ineligible', 'decline'),
    ('coronary_bypass', 'Bypass Surgery', 'declined', 0, 'Decline: Coronary bypass surgery', 'ineligible', 'decline'),
    ('afib', 'Arrhythmia', 'declined', 0, 'Decline: Arrhythmia / atrial fibrillation', 'ineligible', 'decline'),
    ('valve_disorder', 'Heart Valve Disease', 'declined', 0, 'Decline: Aortic/mitral insufficiency/stenosis, valve disease/surgery', 'ineligible', 'decline'),
    ('pacemaker', 'Pacemaker', 'declined', 0, 'Decline: Pacemaker', 'ineligible', 'decline'),
    ('aneurysm', 'Aneurysm', 'declined', 0, 'Decline: Aneurysm', 'ineligible', 'decline'),
    ('stroke', 'Stroke/CVA', 'declined', 0, 'Decline: CVA / Stroke', 'ineligible', 'decline'),
    ('tia', 'TIA', 'declined', 0, 'Decline: Transient ischemic attack', 'ineligible', 'decline'),
    ('peripheral_vascular', 'PVD', 'declined', 0, 'Decline: Peripheral vascular disease', 'ineligible', 'decline'),
    ('pad', 'PAD', 'declined', 0, 'Decline: Peripheral artery disease', 'ineligible', 'decline'),
    ('vascular_surgery', 'Circulatory Surgery', 'declined', 0, 'Decline: Circulatory surgery', 'ineligible', 'decline'),
    ('heart_surgery', 'Heart Surgery', 'declined', 0, 'Decline: Heart surgery/procedure', 'ineligible', 'decline'),
    -- Neurological
    ('alzheimers', 'Alzheimer''s', 'declined', 0, 'Decline: Alzheimer''s disease', 'ineligible', 'decline'),
    ('dementia', 'Dementia', 'declined', 0, 'Decline: Dementia', 'ineligible', 'decline'),
    ('parkinsons', 'Parkinson''s', 'declined', 0, 'Decline: Parkinson''s disease', 'ineligible', 'decline'),
    ('ms', 'Multiple Sclerosis', 'declined', 0, 'Decline: Multiple sclerosis', 'ineligible', 'decline'),
    ('multiple_sclerosis', 'Multiple Sclerosis', 'declined', 0, 'Decline: Multiple sclerosis', 'ineligible', 'decline'),
    ('muscular_dystrophy', 'Muscular Dystrophy', 'declined', 0, 'Decline: Muscular dystrophy', 'ineligible', 'decline'),
    ('paralysis', 'Paralysis', 'declined', 0, 'Decline: Paralysis (paraplegia/quadriplegia)', 'ineligible', 'decline'),
    ('cerebral_palsy', 'Cerebral Palsy', 'declined', 0, 'Decline: Cerebral palsy / Down syndrome', 'ineligible', 'decline'),
    ('als', 'ALS', 'declined', 0, 'Decline: ALS (Lou Gehrig''s disease)', 'ineligible', 'decline'),
    -- Mental Health
    ('bipolar', 'Bipolar Disorder', 'declined', 0, 'Decline: Severe bipolar disorder', 'ineligible', 'decline'),
    ('schizophrenia', 'Schizophrenia', 'declined', 0, 'Decline: Schizophrenia', 'ineligible', 'decline'),
    ('severe_mental_illness', 'Severe Mental Illness', 'declined', 0, 'Decline: Severe depression / mental illness', 'ineligible', 'decline'),
    ('suicide_attempt', 'Suicide Attempt', 'declined', 0, 'Decline: Suicide attempt', 'ineligible', 'decline'),
    -- Respiratory
    ('cystic_fibrosis', 'Cystic Fibrosis', 'declined', 0, 'Decline: Cystic fibrosis', 'ineligible', 'decline'),
    -- Kidney / Liver
    ('kidney_dialysis', 'Kidney Dialysis', 'declined', 0, 'Decline: Kidney dialysis', 'ineligible', 'decline'),
    ('kidney_disease', 'Kidney Disease', 'declined', 0, 'Decline: Chronic kidney disease', 'ineligible', 'decline'),
    ('kidney_failure', 'Kidney Failure', 'declined', 0, 'Decline: Kidney failure', 'ineligible', 'decline'),
    ('chronic_kidney_disease', 'CKD', 'declined', 0, 'Decline: Chronic kidney disease', 'ineligible', 'decline'),
    ('cirrhosis', 'Cirrhosis', 'declined', 0, 'Decline: Cirrhosis', 'ineligible', 'decline'),
    ('liver_disease', 'Liver Disease', 'declined', 0, 'Decline: Liver disease', 'ineligible', 'decline'),
    ('liver_failure', 'Liver Failure', 'declined', 0, 'Decline: Liver failure', 'ineligible', 'decline'),
    ('hepatitis_c', 'Hepatitis B/C', 'declined', 0, 'Decline: Hepatitis B or C', 'ineligible', 'decline'),
    -- Autoimmune
    ('sle_lupus', 'SLE Lupus', 'declined', 0, 'Decline: Systemic lupus (SLE)', 'ineligible', 'decline'),
    -- Cancer
    ('hodgkins_disease', 'Hodgkin''s Disease', 'declined', 0, 'Decline: Hodgkin''s disease', 'ineligible', 'decline'),
    ('leukemia', 'Leukemia', 'declined', 0, 'Decline: Leukemia', 'ineligible', 'decline'),
    -- HIV/AIDS
    ('aids', 'AIDS', 'declined', 0, 'Decline: AIDS/ARC', 'ineligible', 'decline'),
    ('hiv_aids', 'HIV/AIDS', 'declined', 0, 'Decline: HIV/AIDS', 'ineligible', 'decline'),
    ('hiv_positive', 'HIV Positive', 'declined', 0, 'Decline: HIV positive', 'ineligible', 'decline'),
    -- Substance
    ('drug_abuse', 'Drug Abuse', 'declined', 0, 'Decline: Drug use (other than marijuana)', 'ineligible', 'decline'),
    -- Other absolute declines
    ('adl_impairment', 'ADL Impairment', 'declined', 0, 'Decline: ADL assistance required / wheelchair use', 'ineligible', 'decline'),
    ('nursing_facility', 'Nursing Facility', 'declined', 0, 'Decline: Nursing home/facility', 'ineligible', 'decline'),
    ('oxygen_required', 'Oxygen Required', 'declined', 0, 'Decline: Oxygen use', 'ineligible', 'decline'),
    -- Diabetes complications (always decline)
    ('diabetic_retinopathy', 'Diabetic Retinopathy', 'declined', 0, 'Decline: Diabetes with retinopathy', 'ineligible', 'decline'),
    ('diabetic_neuropathy', 'Diabetic Neuropathy', 'declined', 0, 'Decline: Diabetes with neuropathy', 'ineligible', 'decline'),
    ('diabetes_uncontrolled', 'Diabetes Uncontrolled', 'declined', 0, 'Decline: Poorly controlled diabetes', 'ineligible', 'decline'),
    -- Product-specific declines (conservative for v1; v2 overrides Strong Foundation below)
    ('copd', 'COPD', 'declined', 0, 'Decline: COPD (Strong Foundation may accept mild non-smoker cases)', 'ineligible', 'decline'),
    ('diabetes_insulin_early', 'Diabetes Type 1/Insulin', 'declined', 0, 'Decline: Type 1 / insulin-dependent diabetes (Strong Foundation may accept with age criteria)', 'ineligible', 'decline'),

    -- ═══ CASE_BY_CASE / APPROVED conditions (all 3 products) ═══
    ('alcohol_abuse', 'Alcohol Abuse', 'case_by_case', 0.4, 'Accept: 5yr+ abstained, no relapse | Decline: Within 5yr or relapse', 'refer', 'refer'),
    ('rheumatoid_arthritis', 'Arthritis', 'case_by_case', 0.5, 'Accept: Osteoarthritis or mild RA | Decline: Moderate/severe RA', 'refer', 'refer'),
    ('asthma', 'Asthma', 'case_by_case', 0.6, 'Accept: Mild/moderate, no hospitalization | Decline: Severe or hospitalization', 'refer', 'refer'),
    ('high_blood_pressure', 'Blood Pressure', 'approved', 0.8, 'Accept: Controlled blood pressure', 'eligible', 'standard'),
    ('cancer', 'Cancer', 'case_by_case', 0.3, 'Accept: Basal cell carcinoma OR 10yr+ since treatment, no recurrence | Decline: All other cancers including Hodgkin''s', 'refer', 'refer'),
    ('ulcerative_colitis', 'Colitis', 'case_by_case', 0.4, 'Accept: Mild/intermittent | Decline: Severe or chronic', 'refer', 'refer'),
    ('crohns', 'Crohn''s Disease', 'case_by_case', 0.4, 'Accept: 5yr+ remission | Decline: Active or recent', 'refer', 'refer'),
    ('depression', 'Depression', 'case_by_case', 0.5, 'Accept: Mild, age >25, onset 1yr+, no hospitalization | Decline: Severe or hospitalized', 'refer', 'refer'),
    ('diabetes', 'Diabetes Type 2', 'case_by_case', 0.5, 'Accept: Type 2, oral meds only, good control, non-smoker | Decline: Poor control, complications, or exceeds build limits', 'refer', 'refer'),
    ('epilepsy', 'Epilepsy', 'case_by_case', 0.5, 'Accept: Controlled, no seizures 2yr | Decline: Uncontrolled or recent seizures', 'refer', 'refer'),
    ('lupus', 'Lupus (Discoid)', 'case_by_case', 0.4, 'Accept: Discoid lupus only | Decline: Systemic lupus (SLE)', 'refer', 'refer'),
    ('pancreatitis', 'Pancreatitis', 'case_by_case', 0.4, 'Accept: Single acute episode >1yr ago, non-alcohol related | Decline: Chronic or multiple episodes', 'refer', 'refer'),
    ('sleep_apnea', 'Sleep Apnea', 'approved', 0.8, 'Accept: Treated and controlled', 'eligible', 'standard'),
    ('thyroid_disorder', 'Thyroid Disorder', 'approved', 0.8, 'Accept: Treated, no symptoms', 'eligible', 'standard');

  -- ═══════════════════════════════════════════════
  -- V1: carrier_condition_acceptance
  -- ═══════════════════════════════════════════════

  -- V1 for term_life (covers Strong Foundation + Your Term)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  )
  SELECT
    v_carrier_id, c.code, v_imo_id, c.acceptance,
    NULL, c.approval_likelihood, c.notes, 'manual', 'term_life', 'approved'
  FROM _ff_conditions c
  ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes,
    approval_likelihood = EXCLUDED.approval_likelihood, updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Foresters v1 term_life: inserted/updated % acceptance rules', v_count;

  -- V1 for participating_whole_life (Advantage Plus II)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  )
  SELECT
    v_carrier_id, c.code, v_imo_id, c.acceptance,
    NULL, c.approval_likelihood, c.notes, 'manual', 'whole_life', 'approved'
  FROM _ff_conditions c
  ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes,
    approval_likelihood = EXCLUDED.approval_likelihood, updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Foresters v1 whole_life: inserted/updated % acceptance rules', v_count;

  -- ═══════════════════════════════════════════════
  -- V2: underwriting_rule_sets + underwriting_rules
  -- ═══════════════════════════════════════════════

  FOR v_pid, v_ptype, v_pname IN
    VALUES
      (v_strong_id,   'term_life',                'Strong Foundation'),
      (v_yourterm_id, 'term_life',                'Your Term'),
      (v_advplus_id,  'participating_whole_life',  'Advantage Plus II')
  LOOP
    -- Insert rule sets
    INSERT INTO underwriting_rule_sets (
      id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
      description, is_active, version, default_outcome, source, review_status, source_type, needs_review
    )
    SELECT
      gen_random_uuid(),
      v_imo_id,
      v_carrier_id,
      v_pid,
      'condition'::rule_set_scope,
      c.code,
      'default',
      'Foresters ' || v_pname || ' - ' || c.display_name,
      c.notes,
      true,
      1,
      v_default_outcome,
      'manual',
      'approved'::rule_review_status,
      'manual'::rule_source_type,
      false
    FROM _ff_conditions c
    WHERE NOT EXISTS (
      SELECT 1 FROM underwriting_rule_sets rs
      WHERE rs.carrier_id = v_carrier_id
        AND rs.product_id = v_pid
        AND rs.condition_code = c.code
        AND rs.scope = 'condition'
    );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Foresters % v2: inserted % new rule sets', v_pname, v_count;

    -- Insert rules
    INSERT INTO underwriting_rules (
      id, rule_set_id, priority, name, predicate, predicate_version,
      outcome_eligibility, outcome_health_class, outcome_reason
    )
    SELECT
      gen_random_uuid(),
      rs.id,
      1,
      c.display_name || ' - ' || v_pname,
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
      c.notes
    FROM underwriting_rule_sets rs
    JOIN _ff_conditions c ON c.code = rs.condition_code
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_pid
      AND rs.scope = 'condition'
      AND NOT EXISTS (
        SELECT 1 FROM underwriting_rules r
        WHERE r.rule_set_id = rs.id
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Foresters % v2: inserted % new rules', v_pname, v_count;
  END LOOP;

  -- ═══════════════════════════════════════════════
  -- V2 OVERRIDE: Strong Foundation product-specific rules
  -- COPD: mild non-smoker = refer (case_by_case in v1 context)
  -- Diabetes Type 1/insulin: age-restricted = refer
  -- ═══════════════════════════════════════════════

  UPDATE underwriting_rules r SET
    outcome_eligibility = 'refer',
    outcome_health_class = 'refer'::health_class,
    outcome_reason = 'Accept: Non-smoker, mild COPD, no oxygen/steroids, little SOB | Decline: Smoker or severe'
  FROM underwriting_rule_sets rs
  WHERE r.rule_set_id = rs.id
    AND rs.carrier_id = v_carrier_id
    AND rs.product_id = v_strong_id
    AND rs.condition_code = 'copd'
    AND rs.scope = 'condition';

  UPDATE underwriting_rules r SET
    outcome_eligibility = 'refer',
    outcome_health_class = 'refer'::health_class,
    outcome_reason = 'Accept: Type 1 insulin, ages 40-59 dx<5yr OR ages 60+ dx<25yr | Decline: All others'
  FROM underwriting_rule_sets rs
  WHERE r.rule_set_id = rs.id
    AND rs.carrier_id = v_carrier_id
    AND rs.product_id = v_strong_id
    AND rs.condition_code = 'diabetes_insulin_early'
    AND rs.scope = 'condition';

  RAISE NOTICE 'Foresters Strong Foundation: overrode COPD and Diabetes Type 1 to refer/refer';

END $$;
