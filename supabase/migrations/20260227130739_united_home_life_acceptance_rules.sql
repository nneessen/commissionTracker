-- United Home Life acceptance rules
-- Carrier: United Home Life (5926d3f0-f115-4133-812a-c14519d7b0e1)
-- Products (4-tier whole life system):
--   Premier (a288ccb9-40fe-4504-942c-c39dba7960c4) - most restrictive
--   Deluxe  (b73edfb3-c211-46a9-9d2f-478f2d5d1181) - slightly less restrictive
--   EIWL    (7c3a123e-cde8-46d6-810e-14a5eacea956) - broader acceptance
--   GIWL    (bfe23b1f-700d-4dec-8356-77c3201badcf) - guaranteed issue, most accepting
--
-- Source: United Home Life Medical Impairment Guide
-- Many conditions have time-based acceptance windows that differ by tier.
-- V1 uses summarized acceptance (case_by_case for time-dependent conditions).
-- V2 differentiates per product using per-tier outcome columns.

DO $$
DECLARE
  v_carrier_id  uuid := '5926d3f0-f115-4133-812a-c14519d7b0e1';
  v_premier_id  uuid := 'a288ccb9-40fe-4504-942c-c39dba7960c4';
  v_deluxe_id   uuid := 'b73edfb3-c211-46a9-9d2f-478f2d5d1181';
  v_eiwl_id     uuid := '7c3a123e-cde8-46d6-810e-14a5eacea956';
  v_giwl_id     uuid := 'bfe23b1f-700d-4dec-8356-77c3201badcf';
  v_imo_id      uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  -- Add missing health condition codes
  INSERT INTO underwriting_health_conditions (code, name, category)
  VALUES
    ('sickle_cell', 'Sickle Cell Disease', 'blood'),
    ('huntingtons', 'Huntington''s Disease', 'neurological')
  ON CONFLICT (code) DO NOTHING;

  -- Denormalized temp table: one row per condition with per-product V2 outcomes
  CREATE TEMP TABLE _uhl (
    code text,
    display_name text,
    notes text,
    v1_acceptance text,
    v1_likelihood numeric,
    premier text,       premier_class text,
    deluxe text,        deluxe_class text,
    eiwl text,          eiwl_class text,
    giwl text,          giwl_class text
  ) ON COMMIT DROP;

  INSERT INTO _uhl VALUES
    -- ═══ ALWAYS DECLINE - all 4 products (N N N N) ═══
    ('aids',         'AIDS',         'Decline: AIDS/HIV/ARC - all products',  'declined', 0, 'ineligible','decline','ineligible','decline','ineligible','decline','ineligible','decline'),
    ('hiv_aids',     'HIV/AIDS',     'Decline: HIV/AIDS - all products',      'declined', 0, 'ineligible','decline','ineligible','decline','ineligible','decline','ineligible','decline'),
    ('hiv_positive', 'HIV Positive', 'Decline: HIV positive - all products',  'declined', 0, 'ineligible','decline','ineligible','decline','ineligible','decline','ineligible','decline'),
    ('alzheimers',   'Alzheimer''s', 'Decline: Alzheimer''s - all products',  'declined', 0, 'ineligible','decline','ineligible','decline','ineligible','decline','ineligible','decline'),
    ('dementia',     'Dementia',     'Decline: Dementia - all products',      'declined', 0, 'ineligible','decline','ineligible','decline','ineligible','decline','ineligible','decline'),

    -- ═══ ALWAYS ACCEPT - all 4 products (Y Y Y Y) ═══
    ('high_blood_pressure', 'Blood Pressure',       'Accept: Controlled blood pressure - all products',                      'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),
    ('high_cholesterol',    'Cholesterol',           'Accept: Cholesterol treatment - all products',                          'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),
    ('diabetes',            'Diabetes (oral)',       'Accept: Type 2 diabetes, oral meds only (no insulin) - all products',   'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),
    ('asthma',              'Mild Asthma',           'Accept: Mild asthma, no hospitalization w/in 2yr - all products',       'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),
    ('sleep_apnea',         'Sleep Apnea',           'Accept: Sleep apnea, no oxygen use (CPAP OK) - all products',          'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),
    ('epilepsy',            'Seizures (controlled)', 'Accept: Controlled seizures, no seizure w/in 2yr - all products',      'approved', 0.8, 'eligible','standard','eligible','standard','eligible','standard','eligible','standard'),

    -- ═══ TIME-BASED CARDIAC PATTERN ═══
    -- P/D: Decline <2yr, Accept >=2yr | EIWL: Decline <12mo, Accept >=12mo | GIWL: Accept all
    ('aneurysm',                 'Aneurysm',          'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('angioplasty',              'Angioplasty',       'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('cardiomyopathy',           'Cardiomyopathy',    'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('vascular_surgery',         'Circulatory',       'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('congestive_heart_failure', 'CHF',               'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('heart_attack',             'Heart Attack',      'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('heart_disease',            'Heart Disease',     'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('heart_surgery',            'Heart Surgery',     'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('coronary_bypass',          'Bypass Surgery',    'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('cardiac_stent',            'Heart Stent',       'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('valve_disorder',           'Heart Valve',       'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('afib',                     'Irregular Heart',   'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('peripheral_vascular',      'PVD',               'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('pad',                      'PAD',               'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('stroke',                   'Stroke/CVA',        'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('cancer',                   'Cancer',            'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.3, 'refer','refer','refer','refer','refer','refer','eligible','standard'),
    ('angina',                   'Angina',            'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all',  'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard'),

    -- ═══ P/D DECLINE, E/G ACCEPT (N N Y Y) ═══
    ('copd',               'COPD',               'P/D: Decline all COPD | EIWL: Accept without oxygen | GIWL: Accept all',                'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','refer','refer','eligible','standard'),
    ('kidney_disease',     'Kidney Disease',     'P/D: Decline | EIWL/GIWL: Accept (no dialysis, includes renal insufficiency)',           'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('chronic_kidney_disease','CKD',             'P/D: Decline | EIWL/GIWL: Accept (no dialysis)',                                        'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('kidney_failure',     'Kidney Failure',     'P/D: Decline | EIWL/GIWL: Accept (no dialysis)',                                        'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('liver_disease',      'Liver Disease',      'P/D: Decline | EIWL/GIWL: Accept (includes cirrhosis, Hep B/C)',                        'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('cirrhosis',          'Cirrhosis',          'P/D: Decline | EIWL/GIWL: Accept',                                                      'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('liver_failure',      'Liver Failure',      'P/D: Decline | EIWL/GIWL: Accept',                                                      'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('hepatitis_c',        'Hepatitis B/C',      'P/D: Decline | EIWL/GIWL: Accept',                                                      'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('chronic_lung_disease','Lung Disease',       'P/D: Decline | EIWL/GIWL: Accept (excluding mild controlled asthma)',                   'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('chronic_bronchitis', 'Chronic Bronchitis',  'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('emphysema',          'Emphysema',           'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('ms',                 'Multiple Sclerosis',  'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('multiple_sclerosis', 'Multiple Sclerosis',  'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('muscular_dystrophy', 'Muscular Dystrophy',  'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('parkinsons',         'Parkinson''s',        'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('diabetic_neuropathy','Diabetic Neuropathy', 'P/D: Decline | EIWL/GIWL: Accept (diabetes complication)',                              'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('diabetic_retinopathy','Diabetic Retinopathy','P/D: Decline | EIWL/GIWL: Accept (diabetes complication)',                             'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('sickle_cell',        'Sickle Cell',         'P/D: Decline | EIWL/GIWL: Accept (kids and adults)',                                    'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),
    ('huntingtons',        'Huntington''s',       'P/D: Decline | EIWL/GIWL: Accept',                                                     'case_by_case', 0.3, 'ineligible','decline','ineligible','decline','eligible','standard','eligible','standard'),

    -- ═══ P DECLINE, D/E/G ACCEPT (N Y Y Y) ═══
    ('bipolar',              'Bipolar Disorder',    'Premier: Decline | Deluxe/EIWL/GIWL: Accept',                          'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('diabetes_insulin_early','Diabetes (insulin)',  'Premier: Decline | Deluxe/EIWL/GIWL: Accept insulin treatment',        'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('depression',           'Major Depression',    'Premier: Decline (hosp w/in 12mo) | Deluxe/EIWL/GIWL: Accept',         'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('schizophrenia',        'Schizophrenia',       'Premier: Decline | Deluxe/EIWL/GIWL: Accept',                          'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('lupus',                'SLE Lupus',           'Premier: Decline | Deluxe/EIWL/GIWL: Accept',                          'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('sle_lupus',            'SLE Lupus',           'Premier: Decline | Deluxe/EIWL/GIWL: Accept',                          'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),
    ('severe_mental_illness','Severe Mental Illness','Premier: Decline | Deluxe/EIWL/GIWL: Accept',                         'case_by_case', 0.4, 'ineligible','decline','eligible','standard','eligible','standard','eligible','standard'),

    -- ═══ P/D/E DECLINE, G ACCEPT (N N N Y) ═══
    ('kidney_dialysis', 'Kidney Dialysis',  'P/D/E: Decline | GIWL: Accept',  'case_by_case', 0.2, 'ineligible','decline','ineligible','decline','ineligible','decline','eligible','standard'),
    ('organ_transplant','Organ Transplant', 'P/D/E: Decline | GIWL: Accept',  'case_by_case', 0.2, 'ineligible','decline','ineligible','decline','ineligible','decline','eligible','standard'),
    ('oxygen_required', 'Oxygen Use',       'P/D/E: Decline | GIWL: Accept',  'case_by_case', 0.2, 'ineligible','decline','ineligible','decline','ineligible','decline','eligible','standard'),

    -- ═══ SPECIAL / MIXED PATTERNS ═══
    ('als',              'ALS',             'P/D: Decline | EIWL: Case by case (Y-Maybe) | GIWL: Accept',                                'case_by_case', 0.2, 'ineligible','decline','ineligible','decline','refer','refer','eligible','standard'),
    ('drug_abuse',       'Drug Abuse',      'All: Decline <12mo | P/D: Accept >2yr | EIWL/GIWL: Accept >12mo',                           'case_by_case', 0.3, 'refer','refer','refer','refer','refer','refer','refer','refer'),
    ('alcohol_abuse',    'Alcohol Abuse',   'All: Decline <12mo | P/D: Accept >2yr | EIWL/GIWL: Accept >12mo',                           'case_by_case', 0.3, 'refer','refer','refer','refer','refer','refer','refer','refer'),
    ('tia',              'TIA',             'P/D: Decline <2yr, Accept >2yr | EIWL/GIWL: Accept all',                                    'case_by_case', 0.4, 'refer','refer','refer','refer','eligible','standard','eligible','standard'),
    ('felony_conviction','Felony',          'P/D: Decline <7yr, Accept >7yr | EIWL/GIWL: Accept all',                                    'case_by_case', 0.3, 'refer','refer','refer','refer','eligible','standard','eligible','standard'),
    ('dui_dwi',          'DUI/DWI',         'Premier: Decline <2yr, Accept >5yr | Deluxe/EIWL/GIWL: Accept',                             'case_by_case', 0.4, 'refer','refer','eligible','standard','eligible','standard','eligible','standard'),
    ('suicide_attempt',  'Suicide Attempt', 'Premier: Decline w/in 2yr | Deluxe/EIWL/GIWL: Accept',                                     'case_by_case', 0.3, 'refer','refer','eligible','standard','eligible','standard','eligible','standard'),
    ('pacemaker',        'Pacemaker',       'P/D: Accept >2yr | EIWL: Accept >12mo | GIWL: Accept all (under irregular heart/valve)',     'case_by_case', 0.4, 'refer','refer','refer','refer','refer','refer','eligible','standard');

  -- ═══════════════════════════════════════════════
  -- V1: carrier_condition_acceptance (one entry per condition for whole_life)
  -- ═══════════════════════════════════════════════

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  )
  SELECT
    v_carrier_id, c.code, v_imo_id, c.v1_acceptance,
    NULL, c.v1_likelihood, c.notes, 'manual', 'whole_life', 'approved'
  FROM _uhl c
  ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes,
    approval_likelihood = EXCLUDED.approval_likelihood, updated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'UHL v1 whole_life: inserted/updated % acceptance rules', v_count;

  -- ═══════════════════════════════════════════════
  -- V2: underwriting_rule_sets (one per condition per product)
  -- Uses CROSS JOIN LATERAL to normalize the per-product columns
  -- ═══════════════════════════════════════════════

  INSERT INTO underwriting_rule_sets (
    id, imo_id, carrier_id, product_id, scope, condition_code, variant, name,
    description, is_active, version, default_outcome, source, review_status, source_type, needs_review
  )
  SELECT
    gen_random_uuid(),
    v_imo_id,
    v_carrier_id,
    d.product_id,
    'condition'::rule_set_scope,
    c.code,
    'default',
    'UHL ' || d.product_name || ' - ' || c.display_name,
    c.notes,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _uhl c
  CROSS JOIN LATERAL (VALUES
    (v_premier_id, 'Premier'::text),
    (v_deluxe_id,  'Deluxe'::text),
    (v_eiwl_id,    'EIWL'::text),
    (v_giwl_id,    'GIWL'::text)
  ) AS d(product_id, product_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = d.product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'UHL v2: inserted % new rule sets across 4 products', v_count;

  -- ═══════════════════════════════════════════════
  -- V2: underwriting_rules (one per rule set, with product-specific outcomes)
  -- ═══════════════════════════════════════════════

  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - ' || d.product_name,
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
    d.outcome_elig,
    d.outcome_class::health_class,
    c.notes
  FROM _uhl c
  CROSS JOIN LATERAL (VALUES
    (v_premier_id, 'Premier'::text,  c.premier,  c.premier_class),
    (v_deluxe_id,  'Deluxe'::text,   c.deluxe,   c.deluxe_class),
    (v_eiwl_id,    'EIWL'::text,     c.eiwl,     c.eiwl_class),
    (v_giwl_id,    'GIWL'::text,     c.giwl,     c.giwl_class)
  ) AS d(product_id, product_name, outcome_elig, outcome_class)
  JOIN underwriting_rule_sets rs
    ON rs.carrier_id = v_carrier_id
    AND rs.product_id = d.product_id
    AND rs.condition_code = c.code
    AND rs.scope = 'condition'
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rules r
    WHERE r.rule_set_id = rs.id
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'UHL v2: inserted % new rules across 4 products', v_count;

END $$;
