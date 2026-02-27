-- American Amicable Term Made Simple knockout/acceptance rules
-- Product: Term Made Simple (term_life)
-- Carrier ID: 045536d6-c8bc-4d47-81e3-c3831bdc8826
-- Product ID: 65558e24-6499-4fad-9427-7bad63a5cdda
--
-- Source: Term Made Simple Underwriting Knockout Conditions
-- Tiered lookback: Ever / 2 Years / 1 Year / Current — all conditions = decline

-- Add missing condition codes to underwriting_health_conditions lookup table
INSERT INTO underwriting_health_conditions (id, name, code, category, follow_up_schema, risk_weight, sort_order, is_active, follow_up_schema_version, acceptance_key_fields, knockout_category)
VALUES
  (gen_random_uuid(), 'Myasthenia Gravis', 'myasthenia_gravis', 'Neurological', '{}', 8, 0, true, 1, '{}', 'standard'),
  (gen_random_uuid(), 'Pulmonary Hypertension', 'pulmonary_hypertension', 'Respiratory', '{}', 8, 0, true, 1, '{}', 'standard')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_carrier_id uuid := '045536d6-c8bc-4d47-81e3-c3831bdc8826';
  v_product_id uuid := '65558e24-6499-4fad-9427-7bad63a5cdda';
  v_imo_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_product_type text := 'term_life';
  v_default_outcome jsonb := '{"eligibility": "unknown", "health_class": "unknown", "table_rating": "none", "reason": "No matching rule - manual review required"}';
  v_count int := 0;
BEGIN

  -- =====================================================================
  -- V1: carrier_condition_acceptance rules (all knockouts = declined)
  -- =====================================================================

  -- ========================================
  -- EVER (lifetime knockout)
  -- ========================================

  -- Congestive Heart Failure
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'congestive_heart_failure', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Congestive Heart Failure', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cardiomyopathy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiomyopathy', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Cardiomyopathy', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- AIDS
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'aids', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- HIV
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_aids', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: HIV/AIDS', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hiv_positive', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: HIV Positive', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Kidney Dialysis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_dialysis', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Kidney Dialysis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Renal Insufficiency / Chronic Kidney Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_kidney_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Renal Insufficiency / Chronic Kidney Disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Kidney Disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'kidney_failure', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Kidney / Renal Failure', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Liver, Renal or Respiratory Failure
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_failure', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Liver Failure', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'liver_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Liver Disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Diabetic Complications (Retinopathy, Neuropathy, Nephropathy)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_retinopathy', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Diabetic Retinopathy', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetic_neuropathy', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Diabetic Neuropathy', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Insulin use prior to age 50
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'diabetes_insulin_early', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Insulin use prior to age 50', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alzheimer's or Dementia
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alzheimers', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Alzheimer''s Disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'dementia', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Dementia', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Suicide attempt
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'suicide_attempt', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Suicide attempt', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Mental incapacity
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'mental_incapacity', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Mental incapacity', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Down Syndrome / Autism (using cerebral_palsy as nearest existing code)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cerebral_palsy', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Down Syndrome / Autism / developmental disability', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Organ or Tissue Transplant
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'organ_transplant', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Organ or Tissue Transplant', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'transplant_advised', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Organ transplant medically advised', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Multiple/Metastatic Cancer
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_multiple', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Multiple occurrences of cancer', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer_metastatic', v_imo_id, 'declined',
    NULL, 0, 'Knockout EVER: Metastatic cancer', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- 2 YEARS (past 2 year knockout)
  -- ========================================

  -- Schizophrenia
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'schizophrenia', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Schizophrenia', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'severe_mental_illness', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Severe mental illness', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Bipolar Disorder
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'bipolar', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Bipolar Disorder', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Seizure / Epilepsy
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'epilepsy', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Seizure / Epilepsy', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Myasthenia Gravis (new condition code)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'myasthenia_gravis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Myasthenia Gravis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Stroke
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'stroke', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Stroke', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- TIA
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'tia', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: TIA', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Heart/brain/circulatory procedures
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'heart_surgery', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Heart/brain/circulatory surgery', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'coronary_bypass', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Coronary bypass', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angioplasty', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Angioplasty', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cardiac_stent', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Cardiac stent', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'vascular_surgery', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Vascular surgery', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Angina
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'angina', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Angina', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Parkinson's disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'parkinsons', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Parkinson''s disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cancer (all types)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cancer', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Cancer', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'leukemia', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Leukemia', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'melanoma', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Melanoma', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lymphoma', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Lymphoma', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'internal_cancer', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Internal cancer', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hodgkins_disease', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Hodgkin''s Disease', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- COPD
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'copd', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: COPD', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Chronic Bronchitis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_bronchitis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Chronic Bronchitis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Emphysema
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'emphysema', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Emphysema', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Multiple Sclerosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'ms', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Multiple Sclerosis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'multiple_sclerosis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Multiple Sclerosis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Hepatitis (B, C or Chronic)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hepatitis_c', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Hepatitis B, C or Chronic', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Cirrhosis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'cirrhosis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Cirrhosis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Chronic Pancreatitis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pancreatitis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Chronic Pancreatitis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Rheumatoid or Psoriatic Arthritis
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'rheumatoid_arthritis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Rheumatoid or Psoriatic Arthritis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'psoriasis', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Psoriatic Arthritis', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Systemic Lupus (SLE)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'lupus', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Systemic Lupus (SLE)', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'sle_lupus', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Systemic Lupus Erythematosus', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Connective Tissue Disease
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'scleroderma', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Connective Tissue Disease / Scleroderma', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Pulmonary Hypertension (new condition code)
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'pulmonary_hypertension', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Pulmonary Hypertension', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Alcohol or Drug abuse
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'alcohol_abuse', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Alcohol abuse', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'drug_abuse', v_imo_id, 'declined',
    NULL, 0, 'Knockout 2YR: Drug abuse', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- 1 YEAR knockout
  -- ========================================

  -- Chronic Pain with Opiate Use
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'chronic_pain_opiates', v_imo_id, 'declined',
    NULL, 0, 'Knockout 1YR: Chronic Pain with Opiate Use', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'opioid_usage', v_imo_id, 'declined',
    NULL, 0, 'Knockout 1YR: Opioid usage', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- ========================================
  -- CURRENT (right now)
  -- ========================================

  -- Hospitalized or confined to nursing facility
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'nursing_facility', v_imo_id, 'declined',
    NULL, 0, 'Knockout CURRENT: Confined to nursing facility', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospitalization_extended', v_imo_id, 'declined',
    NULL, 0, 'Knockout CURRENT: Hospitalized or confined', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Receiving Hospice or home health care
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'hospice_care', v_imo_id, 'declined',
    NULL, 0, 'Knockout CURRENT: Hospice or home health care', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  -- Require assistance with ADLs
  INSERT INTO carrier_condition_acceptance (
    carrier_id, condition_code, imo_id, acceptance,
    health_class_result, approval_likelihood, notes, source, product_type, review_status
  ) VALUES (
    v_carrier_id, 'adl_impairment', v_imo_id, 'declined',
    NULL, 0, 'Knockout CURRENT: Requires assistance with activities of daily living', 'manual', v_product_type, 'approved'
  ) ON CONFLICT (carrier_id, condition_code, product_type, imo_id) DO UPDATE SET
    acceptance = EXCLUDED.acceptance, notes = EXCLUDED.notes, updated_at = NOW();
  v_count := v_count + 1;

  RAISE NOTICE 'American Amicable Term Made Simple v1: inserted/updated % acceptance rules', v_count;

  -- =====================================================================
  -- V2: underwriting_rule_sets + underwriting_rules
  -- =====================================================================

  v_count := 0;

  CREATE TEMP TABLE _aa_tms_conditions (
    code text,
    display_name text,
    tier text,
    outcome_elig text DEFAULT 'ineligible',
    outcome_class text DEFAULT 'decline',
    outcome_reason text
  ) ON COMMIT DROP;

  INSERT INTO _aa_tms_conditions (code, display_name, tier, outcome_reason) VALUES
    -- EVER
    ('congestive_heart_failure', 'CHF', 'ever', 'Congestive Heart Failure'),
    ('cardiomyopathy', 'Cardiomyopathy', 'ever', 'Cardiomyopathy'),
    ('aids', 'AIDS', 'ever', 'AIDS'),
    ('hiv_aids', 'HIV/AIDS', 'ever', 'HIV/AIDS'),
    ('hiv_positive', 'HIV Positive', 'ever', 'HIV Positive'),
    ('kidney_dialysis', 'Kidney Dialysis', 'ever', 'Kidney Dialysis'),
    ('chronic_kidney_disease', 'CKD', 'ever', 'Chronic Kidney Disease / Renal Insufficiency'),
    ('kidney_disease', 'Kidney Disease', 'ever', 'Kidney Disease'),
    ('kidney_failure', 'Kidney Failure', 'ever', 'Kidney / Renal Failure'),
    ('liver_failure', 'Liver Failure', 'ever', 'Liver Failure'),
    ('liver_disease', 'Liver Disease', 'ever', 'Liver Disease'),
    ('diabetic_retinopathy', 'Diabetic Retinopathy', 'ever', 'Diabetic Retinopathy'),
    ('diabetic_neuropathy', 'Diabetic Neuropathy', 'ever', 'Diabetic Neuropathy'),
    ('diabetes_insulin_early', 'Insulin Before 50', 'ever', 'Insulin use prior to age 50'),
    ('alzheimers', 'Alzheimer''s', 'ever', 'Alzheimer''s Disease'),
    ('dementia', 'Dementia', 'ever', 'Dementia'),
    ('suicide_attempt', 'Suicide Attempt', 'ever', 'Suicide attempt'),
    ('mental_incapacity', 'Mental Incapacity', 'ever', 'Mental incapacity'),
    ('cerebral_palsy', 'Down Syndrome/Autism', 'ever', 'Down Syndrome / Autism / developmental disability'),
    ('organ_transplant', 'Organ Transplant', 'ever', 'Organ or Tissue Transplant'),
    ('transplant_advised', 'Transplant Advised', 'ever', 'Organ transplant medically advised'),
    ('cancer_multiple', 'Multiple Cancer', 'ever', 'Multiple occurrences of cancer'),
    ('cancer_metastatic', 'Metastatic Cancer', 'ever', 'Metastatic cancer'),
    -- 2 YEARS
    ('schizophrenia', 'Schizophrenia', '2yr', 'Schizophrenia'),
    ('severe_mental_illness', 'Severe Mental Illness', '2yr', 'Severe mental illness'),
    ('bipolar', 'Bipolar Disorder', '2yr', 'Bipolar Disorder'),
    ('epilepsy', 'Seizure/Epilepsy', '2yr', 'Seizure / Epilepsy'),
    ('myasthenia_gravis', 'Myasthenia Gravis', '2yr', 'Myasthenia Gravis'),
    ('stroke', 'Stroke', '2yr', 'Stroke'),
    ('tia', 'TIA', '2yr', 'Transient Ischemic Attack'),
    ('heart_surgery', 'Heart Surgery', '2yr', 'Heart/brain/circulatory surgery'),
    ('coronary_bypass', 'Coronary Bypass', '2yr', 'Coronary bypass'),
    ('angioplasty', 'Angioplasty', '2yr', 'Angioplasty'),
    ('cardiac_stent', 'Cardiac Stent', '2yr', 'Cardiac stent'),
    ('vascular_surgery', 'Vascular Surgery', '2yr', 'Vascular surgery'),
    ('angina', 'Angina', '2yr', 'Angina'),
    ('parkinsons', 'Parkinson''s', '2yr', 'Parkinson''s disease'),
    ('cancer', 'Cancer', '2yr', 'Cancer'),
    ('leukemia', 'Leukemia', '2yr', 'Leukemia'),
    ('melanoma', 'Melanoma', '2yr', 'Melanoma'),
    ('lymphoma', 'Lymphoma', '2yr', 'Lymphoma'),
    ('internal_cancer', 'Internal Cancer', '2yr', 'Internal cancer'),
    ('hodgkins_disease', 'Hodgkin''s Disease', '2yr', 'Hodgkin''s Disease'),
    ('copd', 'COPD', '2yr', 'COPD'),
    ('chronic_bronchitis', 'Chronic Bronchitis', '2yr', 'Chronic Bronchitis'),
    ('emphysema', 'Emphysema', '2yr', 'Emphysema'),
    ('ms', 'Multiple Sclerosis', '2yr', 'Multiple Sclerosis'),
    ('multiple_sclerosis', 'Multiple Sclerosis', '2yr', 'Multiple Sclerosis'),
    ('hepatitis_c', 'Hepatitis B/C/Chronic', '2yr', 'Hepatitis B, C or Chronic'),
    ('cirrhosis', 'Cirrhosis', '2yr', 'Cirrhosis'),
    ('pancreatitis', 'Chronic Pancreatitis', '2yr', 'Chronic Pancreatitis'),
    ('rheumatoid_arthritis', 'Rheumatoid Arthritis', '2yr', 'Rheumatoid or Psoriatic Arthritis'),
    ('psoriasis', 'Psoriatic Arthritis', '2yr', 'Psoriatic Arthritis'),
    ('lupus', 'Lupus (SLE)', '2yr', 'Systemic Lupus (SLE)'),
    ('sle_lupus', 'SLE Lupus', '2yr', 'Systemic Lupus Erythematosus'),
    ('scleroderma', 'Scleroderma', '2yr', 'Connective Tissue Disease / Scleroderma'),
    ('pulmonary_hypertension', 'Pulmonary Hypertension', '2yr', 'Pulmonary Hypertension'),
    ('alcohol_abuse', 'Alcohol Abuse', '2yr', 'Alcohol abuse'),
    ('drug_abuse', 'Drug Abuse', '2yr', 'Drug abuse'),
    -- 1 YEAR
    ('chronic_pain_opiates', 'Chronic Pain + Opiates', '1yr', 'Chronic Pain with Opiate Use'),
    ('opioid_usage', 'Opioid Usage', '1yr', 'Opioid usage'),
    -- CURRENT
    ('nursing_facility', 'Nursing Facility', 'current', 'Confined to nursing facility'),
    ('hospitalization_extended', 'Hospitalized', 'current', 'Hospitalized or confined'),
    ('hospice_care', 'Hospice Care', 'current', 'Hospice or home health care'),
    ('adl_impairment', 'ADL Impairment', 'current', 'Requires assistance with activities of daily living');

  -- Insert v2 rule sets (skip any that already exist, e.g. the existing diabetes one)
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
    'AA Term Made Simple - ' || c.display_name,
    'Knockout (' || c.tier || '): ' || c.outcome_reason,
    true,
    1,
    v_default_outcome,
    'manual',
    'approved'::rule_review_status,
    'manual'::rule_source_type,
    false
  FROM _aa_tms_conditions c
  WHERE NOT EXISTS (
    SELECT 1 FROM underwriting_rule_sets rs
    WHERE rs.carrier_id = v_carrier_id
      AND rs.product_id = v_product_id
      AND rs.condition_code = c.code
      AND rs.scope = 'condition'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Term Made Simple v2: inserted % new rule sets', v_count;

  -- Insert rules for each rule set
  v_count := 0;

  INSERT INTO underwriting_rules (
    id, rule_set_id, priority, name, predicate, predicate_version,
    outcome_eligibility, outcome_health_class, outcome_reason
  )
  SELECT
    gen_random_uuid(),
    rs.id,
    1,
    c.display_name || ' - Knockout',
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
    'Knockout (' || c.tier || '): ' || c.outcome_reason
  FROM underwriting_rule_sets rs
  JOIN _aa_tms_conditions c ON c.code = rs.condition_code
  WHERE rs.carrier_id = v_carrier_id
    AND rs.product_id = v_product_id
    AND rs.scope = 'condition'
    AND NOT EXISTS (
      SELECT 1 FROM underwriting_rules r
      WHERE r.rule_set_id = rs.id
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'AA Term Made Simple v2: inserted % new rules', v_count;

END $$;
