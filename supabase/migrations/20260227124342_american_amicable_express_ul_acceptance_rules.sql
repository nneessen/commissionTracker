-- American Amicable Express UL acceptance rules
-- Product: Express UL (universal_life)
-- Carrier ID: 045536d6-c8bc-4d47-81e3-c3831bdc8826
-- Product ID: 7b80824e-8e97-41ae-b453-52ae4466ecf3
--
-- Source: Express UL Medical Impairment Guide
-- Standard/Decline binary model. Cancer lookback: 7 years.
-- Nearly identical to Express Term except cancer lookback (7yr vs 8yr).

DO $$
DECLARE
  v_carrier_id uuid := '045536d6-c8bc-4d47-81e3-c3831bdc8826';
  v_product_id uuid := '7b80824e-8e97-41ae-b453-52ae4466ecf3';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'universal_life';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  CREATE TEMP TABLE _aa_ul_conditions (
    code text,
    display_name text,
    acceptance text,
    approval_likelihood numeric,
    notes text,
    outcome_elig text,
    outcome_class text
  ) ON COMMIT DROP;

  INSERT INTO _aa_ul_conditions (code, display_name, acceptance, approval_likelihood, notes, outcome_elig, outcome_class) VALUES
    -- Cardiac / Vascular
    ('congestive_heart_failure', 'CHF', 'declined', 0, 'Decline: Congestive Heart Failure', 'ineligible', 'decline'),
    ('cardiomyopathy', 'Cardiomyopathy', 'declined', 0, 'Decline: Cardiomyopathy', 'ineligible', 'decline'),
    ('heart_disease', 'Heart Disease', 'declined', 0, 'Decline: Heart disease/disorder (includes heart attack, CAD, angina)', 'ineligible', 'decline'),
    ('heart_attack', 'Heart Attack', 'declined', 0, 'Decline: Heart attack', 'ineligible', 'decline'),
    ('angina', 'Angina', 'declined', 0, 'Decline: Angina', 'ineligible', 'decline'),
    ('angioplasty', 'Angioplasty', 'declined', 0, 'Decline: Angioplasty', 'ineligible', 'decline'),
    ('coronary_bypass', 'CABG/Stent', 'declined', 0, 'Decline: By-pass surgery (CABG or stent)', 'ineligible', 'decline'),
    ('cardiac_stent', 'Cardiac Stent', 'declined', 0, 'Decline: Stent placement', 'ineligible', 'decline'),
    ('afib', 'Fibrillation', 'declined', 0, 'Decline: Fibrillation / heart arrhythmia', 'ineligible', 'decline'),
    ('valve_disorder', 'Heart Valve', 'declined', 0, 'Decline: Heart valve replacement', 'ineligible', 'decline'),
    ('pacemaker', 'Pacemaker', 'declined', 0, 'Decline: Pacemaker', 'ineligible', 'decline'),
    ('aneurysm', 'Aneurysm', 'declined', 0, 'Decline: Aneurysm', 'ineligible', 'decline'),
    ('stroke', 'Stroke/CVA', 'declined', 0, 'Decline: Stroke / CVA / subarachnoid hemorrhage', 'ineligible', 'decline'),
    ('peripheral_vascular', 'PVD', 'declined', 0, 'Decline: Peripheral vascular disease', 'ineligible', 'decline'),
    ('vascular_surgery', 'Vascular', 'declined', 0, 'Decline: Vascular impairments', 'ineligible', 'decline'),
    -- Neurological
    ('alzheimers', 'Alzheimer''s', 'declined', 0, 'Decline: Alzheimer''s', 'ineligible', 'decline'),
    ('dementia', 'Dementia', 'declined', 0, 'Decline: Dementia', 'ineligible', 'decline'),
    ('parkinsons', 'Parkinson''s', 'declined', 0, 'Decline: Parkinson''s disease', 'ineligible', 'decline'),
    ('ms', 'Multiple Sclerosis', 'declined', 0, 'Decline: Multiple sclerosis', 'ineligible', 'decline'),
    ('multiple_sclerosis', 'Multiple Sclerosis', 'declined', 0, 'Decline: Multiple sclerosis', 'ineligible', 'decline'),
    ('muscular_dystrophy', 'Muscular Dystrophy', 'declined', 0, 'Decline: Muscular dystrophy', 'ineligible', 'decline'),
    ('paralysis', 'Paralysis', 'declined', 0, 'Decline: Paralysis (paraplegia/quadriplegia)', 'ineligible', 'decline'),
    ('cerebral_palsy', 'Cerebral Palsy', 'declined', 0, 'Decline: Cerebral palsy / Down syndrome', 'ineligible', 'decline'),
    -- Mental Health
    ('bipolar', 'Bipolar', 'declined', 0, 'Decline: Major depression / bipolar disorder', 'ineligible', 'decline'),
    ('schizophrenia', 'Schizophrenia', 'declined', 0, 'Decline: Schizophrenia', 'ineligible', 'decline'),
    ('severe_mental_illness', 'Severe Mental Illness', 'declined', 0, 'Decline: Major depression / severe mental illness', 'ineligible', 'decline'),
    ('suicide_attempt', 'Suicide Attempt', 'declined', 0, 'Decline: Suicide attempt', 'ineligible', 'decline'),
    -- Respiratory
    ('copd', 'COPD', 'declined', 0, 'Decline: COPD', 'ineligible', 'decline'),
    ('chronic_bronchitis', 'Chronic Bronchitis', 'declined', 0, 'Decline: Chronic bronchitis', 'ineligible', 'decline'),
    ('emphysema', 'Emphysema', 'declined', 0, 'Decline: Emphysema', 'ineligible', 'decline'),
    ('chronic_lung_disease', 'Lung Disease', 'declined', 0, 'Decline: Lung disease/disorder', 'ineligible', 'decline'),
    ('cystic_fibrosis', 'Cystic Fibrosis', 'declined', 0, 'Decline: Cystic fibrosis', 'ineligible', 'decline'),
    -- Kidney / Liver / GI
    ('kidney_dialysis', 'Kidney Dialysis', 'declined', 0, 'Decline: Kidney dialysis', 'ineligible', 'decline'),
    ('kidney_disease', 'Kidney Disease', 'declined', 0, 'Decline: Kidney disease (insufficiency/failure/polycystic/nephrectomy/transplant)', 'ineligible', 'decline'),
    ('kidney_failure', 'Kidney Failure', 'declined', 0, 'Decline: Kidney failure', 'ineligible', 'decline'),
    ('chronic_kidney_disease', 'CKD', 'declined', 0, 'Decline: Chronic kidney disease', 'ineligible', 'decline'),
    ('cirrhosis', 'Cirrhosis', 'declined', 0, 'Decline: Cirrhosis of liver', 'ineligible', 'decline'),
    ('liver_disease', 'Liver Disease', 'declined', 0, 'Decline: Liver impairments', 'ineligible', 'decline'),
    ('liver_failure', 'Liver Failure', 'declined', 0, 'Decline: Liver failure', 'ineligible', 'decline'),
    ('hepatitis_c', 'Hepatitis B/C', 'declined', 0, 'Decline: Hepatitis B or C', 'ineligible', 'decline'),
    ('pancreatitis', 'Pancreatitis', 'declined', 0, 'Decline: Chronic or multiple episode pancreatitis', 'ineligible', 'decline'),
    -- Autoimmune / Connective Tissue
    ('lupus', 'Lupus (SLE)', 'declined', 0, 'Decline: Systemic lupus erythematosus (SLE)', 'ineligible', 'decline'),
    ('sle_lupus', 'SLE Lupus', 'declined', 0, 'Decline: Systemic lupus erythematosus', 'ineligible', 'decline'),
    ('scleroderma', 'Connective Tissue', 'declined', 0, 'Decline: Connective tissue disease', 'ineligible', 'decline'),
    -- Cancer
    ('hodgkins_disease', 'Hodgkin''s', 'declined', 0, 'Decline: Hodgkin''s disease', 'ineligible', 'decline'),
    ('leukemia', 'Leukemia', 'declined', 0, 'Decline: Leukemia', 'ineligible', 'decline'),
    -- HIV/AIDS
    ('aids', 'AIDS', 'declined', 0, 'Decline: AIDS/ARC', 'ineligible', 'decline'),
    ('hiv_aids', 'HIV/AIDS', 'declined', 0, 'Decline: HIV/AIDS', 'ineligible', 'decline'),
    ('hiv_positive', 'HIV Positive', 'declined', 0, 'Decline: HIV positive', 'ineligible', 'decline'),
    -- Organ Transplant
    ('organ_transplant', 'Organ Transplant', 'declined', 0, 'Decline: Organ or bone marrow transplant', 'ineligible', 'decline'),
    ('transplant_advised', 'Transplant Advised', 'declined', 0, 'Decline: Transplant on waiting list', 'ineligible', 'decline'),
    -- Other absolute declines
    ('mental_incapacity', 'Mental Incapacity', 'declined', 0, 'Decline: Severe retardation', 'ineligible', 'decline'),
    ('bed_confinement', 'Bed Confinement', 'declined', 0, 'Decline: Bed confinement', 'ineligible', 'decline'),
    ('nursing_facility', 'Nursing Facility', 'declined', 0, 'Decline: Nursing facility', 'ineligible', 'decline'),
    ('hospice_care', 'Hospice Care', 'declined', 0, 'Decline: Hospice/home health care', 'ineligible', 'decline'),
    ('hospitalization_extended', 'Hospitalized', 'declined', 0, 'Decline: Currently hospitalized', 'ineligible', 'decline'),
    ('oxygen_required', 'Oxygen Required', 'declined', 0, 'Decline: Oxygen equipment required', 'ineligible', 'decline'),
    ('terminal_condition', 'Terminal Condition', 'declined', 0, 'Decline: Terminal condition', 'ineligible', 'decline'),
    ('adl_impairment', 'ADL Impairment', 'declined', 0, 'Decline: ADL impairment', 'ineligible', 'decline'),
    ('pending_diagnostics', 'Pending Tests', 'declined', 0, 'Decline: Diagnostic testing/surgery/hospitalization recommended within 12mo not completed', 'ineligible', 'decline'),
    ('myasthenia_gravis', 'Myasthenia Gravis', 'declined', 0, 'Decline: Myasthenia Gravis', 'ineligible', 'decline'),
    ('pulmonary_hypertension', 'Pulmonary HTN', 'declined', 0, 'Decline: Pulmonary hypertension', 'ineligible', 'decline'),

    -- CASE_BY_CASE conditions (7yr cancer lookback for Express UL)
    ('cancer', 'Cancer', 'case_by_case', 0.4, 'Standard: Basal/squamous cell (isolated) OR 7yr+ since surgery/diagnosis/last treatment with no recurrence | Decline: all others', 'refer', 'refer'),
    ('melanoma', 'Melanoma', 'case_by_case', 0.4, 'Standard: 7yr+ since treatment, no recurrence | Decline: all others', 'refer', 'refer'),
    ('internal_cancer', 'Internal Cancer', 'case_by_case', 0.4, 'Standard: 7yr+ since treatment, no recurrence | Decline: all others', 'refer', 'refer'),
    ('lymphoma', 'Lymphoma', 'case_by_case', 0.4, 'Standard: 7yr+ since treatment, no recurrence | Decline: all others', 'refer', 'refer'),
    ('cancer_metastatic', 'Metastatic Cancer', 'declined', 0, 'Decline: Metastatic cancer', 'ineligible', 'decline'),
    ('cancer_multiple', 'Multiple Cancer', 'declined', 0, 'Decline: Multiple cancer occurrences', 'ineligible', 'decline'),
    ('cancer_active', 'Active Cancer', 'declined', 0, 'Decline: Currently have cancer', 'ineligible', 'decline'),
    ('diabetes', 'Diabetes', 'case_by_case', 0.5, 'Standard: Controlled with oral meds only | Decline: Prior to age 35, uses insulin, tobacco in 12mo, with overweight/gout/retinopathy/proteinuria', 'refer', 'refer'),
    ('diabetic_retinopathy', 'Diabetic Retinopathy', 'declined', 0, 'Decline: Diabetes with retinopathy', 'ineligible', 'decline'),
    ('diabetic_neuropathy', 'Diabetic Neuropathy', 'declined', 0, 'Decline: Diabetes with neuropathy', 'ineligible', 'decline'),
    ('diabetes_insulin_early', 'Insulin Before 50', 'declined', 0, 'Decline: Diabetes with insulin', 'ineligible', 'decline'),
    ('diabetes_uncontrolled', 'Diabetes Uncontrolled', 'declined', 0, 'Decline: Diabetes uncontrolled', 'ineligible', 'decline'),
    ('epilepsy', 'Seizures/Epilepsy', 'case_by_case', 0.3, 'Standard: Petit mal only | Decline: All others', 'refer', 'refer'),
    ('rheumatoid_arthritis', 'Rheumatoid Arthritis', 'case_by_case', 0.3, 'Standard: Minimal/slight impairment | Decline: All others', 'refer', 'refer'),
    ('alcohol_abuse', 'Alcohol Abuse', 'case_by_case', 0.3, 'Standard: 4yr+ since abstained | Decline: Within 4yr', 'refer', 'refer'),
    ('drug_abuse', 'Drug Abuse', 'case_by_case', 0.3, 'Standard: 4yr+ treatment, no usage since | Decline: Within 4yr or illegal use', 'refer', 'refer'),
    ('opioid_usage', 'Opioid Dependence', 'case_by_case', 0.3, 'Decline: Within 4yr', 'refer', 'refer'),
    ('chronic_pain_opiates', 'Chronic Pain/Opiates', 'case_by_case', 0.3, 'Decline: Within 4yr', 'refer', 'refer'),
    ('tia', 'TIA', 'case_by_case', 0.3, 'Standard: After 6mo, no residuals, no tobacco | Decline: With tobacco or residuals', 'refer', 'refer'),
    ('felony_conviction', 'Criminal History', 'case_by_case', 0.2, 'Decline: Convicted within 5yr or probation/parole within 6mo', 'refer', 'refer'),
    ('dui_dwi', 'DUI/DWI', 'case_by_case', 0.2, 'Decline: Within 3yr a DWI, 2+ accidents, 3+ violations, or license suspended/revoked', 'refer', 'refer'),
    ('ulcerative_colitis', 'Ulcerative Colitis', 'case_by_case', 0.3, 'Decline: Diagnosed prior to age 20 or within 12mo', 'refer', 'refer'),
    ('crohns', 'Crohn''s Disease', 'case_by_case', 0.3, 'Decline: Diagnosed prior to age 20 or within 12mo', 'refer', 'refer'),
    ('psoriasis', 'Psoriatic Arthritis', 'case_by_case', 0.3, 'Standard: Minimal/slight impairment | Decline: All others', 'refer', 'refer');

  -- V1: Insert acceptance rules
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  )
  SELECT
    v_carrier_id, c.code, v_imo_id, c.acceptance,
    NULL, c.approval_likelihood, c.notes, 'manual', v_product_type, 'approved'
  FROM _aa_ul_conditions c
  ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, approval_likelihood = EXCLUDED.approval_likelihood, updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Express UL v1: inserted/updated % acceptance rules', v_count;

  -- V2: Insert rule sets
  v_count := 0;

  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, is_active, version, default_outcome, source, review_status, source_type, needs_review
  )
  SELECT
    gen_random_uuid(),
    v_imo_id,
    v_carrier_id,
    v_product_id,
    'condition'::rule_set_scope,
    c.code,
    'default',
    'AA Express UL - ' || c.display_name,
    c.notes,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _aa_ul_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Express UL v2: inserted % new rule sets', v_count;

  -- V2: Insert rules
  v_count := 0;

  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Express UL',
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
  JOIN _aa_ul_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Express UL v2: inserted % new rules', v_count;

END $$;
