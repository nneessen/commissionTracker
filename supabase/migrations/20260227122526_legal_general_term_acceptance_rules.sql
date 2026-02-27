-- Legal & General (Banner Life) BeyondTerm acceptance rules
-- Product: Term (term_life)
-- Carrier ID: 0db015b9-defc-4184-b7ca-2063d9ed4caf
-- Product ID: 749366de-5ca5-46a1-9120-9bb085a2c5bb
--
-- Source: BeyondTerm Underwriting Guide - Part II: Accepted Conditions
-- These are conditions Banner Life CAN accommodate under favorable scenarios.
-- Rules are case_by_case with notes describing favorable acceptance criteria.

DO $$
DECLARE
  v_carrier_id uuid := '0db015b9-defc-4184-b7ca-2063d9ed4caf';
  v_product_id uuid := '749366de-5ca5-46a1-9120-9bb085a2c5bb';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'term_life';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  -- =====================================================================
  -- V1: carrier_condition_acceptance rules
  -- =====================================================================

  -- ========================================
  -- AUTOIMMUNE DISORDERS
  -- ========================================

  -- Rheumatoid Arthritis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'rheumatoid_arthritis', v_imo_id, 'case_by_case',
    NULL, 0.7, 'Favorable: No mobility impact, minimal symptoms, no steroids/Methotrexate/immunosuppressives, age >30', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Ulcerative Colitis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ulcerative_colitis', v_imo_id, 'case_by_case',
    NULL, 0.7, 'Favorable: No surgery, no hospitalizations in 2 years, diagnosed >6 months ago, no complications, infrequent flare-ups', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- CANCER
  -- ========================================

  -- Cancer (general - basal/squamous cell favorable)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer', v_imo_id, 'case_by_case',
    NULL, 0.6, 'Basal/squamous cell favorable: Single occurrence, localized, hasn''t spread, all follow-up complete. Other cancers evaluated individually.', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- CARDIAC AND RESPIRATORY
  -- ========================================

  -- Asthma
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'asthma', v_imo_id, 'case_by_case',
    NULL, 0.8, 'Favorable: No ER/hospitalizations, no impact to daily activities, up to 1 medication, no steroids in past year', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Atrial Fibrillation
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'afib', v_imo_id, 'case_by_case',
    NULL, 0.65, 'Favorable: No occurrence in 2 years, no treatment required, all testing/procedures complete, no procedure other than ablation', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Sleep Apnea
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'sleep_apnea', v_imo_id, 'case_by_case',
    NULL, 0.8, 'Favorable: No daily sleepiness symptoms, compliant with treatment or no treatment needed, no oxygen, no symptom medication', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- NON-MEDICAL
  -- ========================================

  -- DUI/Driving Record
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dui_dwi', v_imo_id, 'declined',
    NULL, 0, 'No DWI, DUI or reckless/negligent driving. No license revocation/suspension in 3 years. Max 4 moving violations in 3 years.', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- MENTAL HEALTH
  -- ========================================

  -- Anxiety
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'anxiety', v_imo_id, 'case_by_case',
    NULL, 0.75, 'Favorable: No hospitalization, no suicide attempts, no substance abuse, up to 1 medication, well controlled for 6+ months', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Depression
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'depression', v_imo_id, 'case_by_case',
    NULL, 0.75, 'Favorable: No anti-psychotic meds, no hospitalization, up to 1 medication, no other mental/nervous condition, no substance abuse, no suicide attempts', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- PTSD
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ptsd', v_imo_id, 'case_by_case',
    NULL, 0.7, 'Favorable: No hospitalization, employed/no time off work, up to 1 medication, no self-harm/suicide attempt, no alcohol use', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- METABOLIC CONDITIONS
  -- ========================================

  -- Diabetes
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes', v_imo_id, 'case_by_case',
    NULL, 0.7, 'Favorable: Non-insulin (oral/diet), A1c <8, no complications, diagnosed after age 40, diagnosed >6mo and <5yr, doctor follow-up in past 2 years', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hyperlipidemia / High Cholesterol
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'high_cholesterol', v_imo_id, 'approved',
    'standard', 0.85, 'Favorable: Cholesterol and ratio values known and favorable (treated or untreated)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hypertension / High Blood Pressure
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'high_blood_pressure', v_imo_id, 'case_by_case',
    NULL, 0.8, 'Favorable: 2 or fewer medications, no hospitalizations, normal blood pressure in past 2 years', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- NEUROLOGICAL CONDITIONS
  -- ========================================

  -- Multiple Sclerosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'case_by_case',
    NULL, 0.5, 'Favorable: No mobility issues, relapsing/remitting <3 episodes/yr, diagnosed >1yr ago, age at diagnosis <=35 (or if >35 then current age >=61), no Tysabri', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'case_by_case',
    NULL, 0.5, 'Favorable: No mobility issues, relapsing/remitting <3 episodes/yr, diagnosed >1yr ago, age at diagnosis <=35 (or if >35 then current age >=61), no Tysabri', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Seizure/Epilepsy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'epilepsy', v_imo_id, 'case_by_case',
    NULL, 0.7, 'Favorable: No seizures in 5 years, no hospitalization in 5 years, diagnosed >3 months ago with evaluation complete, no medications needed', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- OTHER
  -- ========================================

  -- Hypothyroidism
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'thyroid_disorder', v_imo_id, 'approved',
    'standard', 0.9, 'Favorable: Controlled, diagnosed >6 months ago, no complications', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, health_class_result = EXCLUDED.health_class_result,
    approval_likelihood = EXCLUDED.approval_likelihood, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'Legal & General Term v1: inserted/updated % acceptance rules', v_count;

  -- =====================================================================
  -- V2: underwriting_rule_sets + underwriting_rules
  -- Only for conditions NOT already configured in v2
  -- =====================================================================

  v_count := 0;

  CREATE TEMP TABLE _lg_new_conditions (
    code text,
    display_name text,
    notes text,
    elig text DEFAULT 'eligible',
    health_class text DEFAULT 'refer'
  ) ON COMMIT DROP;

  -- Conditions from the guide that are NOT yet in v2 for this product
  INSERT INTO _lg_new_conditions (code, display_name, notes) VALUES
    ('rheumatoid_arthritis', 'Rheumatoid Arthritis', 'No mobility impact, minimal symptoms, no steroids/Methotrexate/immunosuppressives, age >30'),
    ('ulcerative_colitis', 'Ulcerative Colitis', 'No surgery, no hospitalizations in 2yr, diagnosed >6mo, no complications, infrequent flare-ups'),
    ('ms', 'Multiple Sclerosis', 'No mobility issues, relapsing/remitting <3 episodes/yr, diagnosed >1yr, age at dx <=35 (or >35 with current age >=61), no Tysabri'),
    ('multiple_sclerosis', 'Multiple Sclerosis', 'No mobility issues, relapsing/remitting <3 episodes/yr, diagnosed >1yr, age at dx <=35 (or >35 with current age >=61), no Tysabri'),
    ('epilepsy', 'Seizure/Epilepsy', 'No seizures in 5yr, no hospitalization in 5yr, diagnosed >3mo with evaluation complete, no medications'),
    ('dui_dwi', 'DUI/DWI', 'No DWI/DUI/reckless driving. Max 4 violations in 3yr. No license revocation/suspension in 3yr.'),
    ('ibs', 'Irritable Bowel Syndrome', 'Mild cases, no complications'),
    ('crohns', 'Crohn''s Disease', 'Similar criteria to ulcerative colitis'),
    ('osteoarthritis', 'Osteoarthritis', 'No significant mobility limitations'),
    ('psoriasis', 'Psoriasis / Psoriatic Arthritis', 'Mild to moderate, controlled'),
    ('fibromyalgia', 'Fibromyalgia', 'Mild symptoms, functioning normally'),
    ('diverticulitis', 'Diverticulitis/Diverticulosis', 'No complications, no recent surgery'),
    ('gastritis', 'GERD / Gastritis / Acid Reflux', 'Controlled with medication'),
    ('migraines', 'Migraines / Chronic Headaches', 'Well controlled, no neurological complications'),
    ('narcolepsy', 'Narcolepsy', 'Controlled with treatment'),
    ('neuropathy', 'Peripheral Neuropathy', 'Mild, known cause, stable'),
    ('kidney_stones', 'Kidney Stones', 'Isolated episodes, no chronic condition'),
    ('back_problems', 'Back/Spine Problems', 'No significant limitations, stable');

  -- Insert rule sets for conditions not already present
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
    'L&G Term - ' || c.display_name,
    'BeyondTerm Guide: ' || c.notes,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _lg_new_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Legal & General Term v2: inserted % new rule sets', v_count;

  -- Insert rules for the new rule sets
  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Favorable Scenario',
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
    c.elig,
    c.health_class::health_class,
    'BeyondTerm Guide: ' || c.notes
  FROM underwriting_rule_sets rs
  JOIN _lg_new_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Legal & General Term v2: inserted % new rules', v_count;

END $$;
